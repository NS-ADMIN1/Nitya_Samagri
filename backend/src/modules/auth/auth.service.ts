// src/modules/auth/auth.service.ts
//
// Sign-up, login (password or phone OTP), sessions and the signed-in
// person's own profile.
//
// Sessions: a short-lived access token (15 min) plus a refresh token that
// is also kept in Redis. Deleting the Redis copy (revokeSessions) is how a
// person is signed out — by logging out, or by being blocked.
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, IUser } from "../../database/models/User";
import { redis } from "../../config/redis";
import { env } from "../../config/env";
import { verifyOtpToken } from "../../config/firebase";
import { effectivePermissions } from "../../config/permissions";
import { sendEmail } from "../../integrations/mail";
import { AppError } from "../../utils/AppError";
import { logger } from "../../utils/logger";
import { EmailOtpVerifyInput, LoginInput, RegisterInput, UpdateProfileInput } from "./auth.schema";

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_ATTEMPT_WINDOW_SECONDS = 15 * 60;
const LOGIN_LOCKOUT_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const WELCOME_POINTS = 100;

/** Roles that sign in to the admin panel with an @adminns.in email. */
const STAFF_LOGIN_ROLES = ["admin", "super_admin", "order_manager", "warehouse", "support"];

const refreshKey = (userId: string) => `refresh:${userId}`;

// ── Sessions ──────────────────────────────────────────────────────────────────

/** Issue a fresh access + refresh token pair and remember the refresh token. */
async function startSession(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  const refreshToken = jwt.sign({ userId, role, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  await redis.setex(refreshKey(userId), REFRESH_TTL_SECONDS, refreshToken);
  return { accessToken, refreshToken };
}

/**
 * Sign a person out everywhere: their refresh token stops working at once,
 * and their current access token runs out within 15 minutes.
 */
export async function revokeSessions(userId: string): Promise<void> {
  await redis.del(refreshKey(userId));
}

function publicUser(user: IUser) {
  return { id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role };
}

// ── Email code (sign-up) ──────────────────────────────────────────────────────
//
// A customer who verifies by email gets a 6-digit code by email. Only a hash
// of the code is kept in Redis. A correct code returns a short-lived
// "emailToken" that /auth/register accepts as proof of the email address.

const EMAIL_CODE_TTL_SECONDS    = 10 * 60;
const EMAIL_CODE_RESEND_SECONDS = 30;
const EMAIL_CODE_MAX_TRIES      = 5;
const EMAIL_CODE_MAX_SENDS      = 5;       // per email address…
const EMAIL_CODE_SENDS_WINDOW   = 60 * 60; // …per hour
const EMAIL_PROOF_EXPIRES_IN    = "30m";

const emailCodeKey  = (email: string) => `email_otp:${email}`;
const emailTriesKey = (email: string) => `email_otp_tries:${email}`;
const emailWaitKey  = (email: string) => `email_otp_wait:${email}`;
const emailSendsKey = (email: string) => `email_otp_sends:${email}`;

const hashEmailCode = (email: string, code: string) =>
  crypto.createHash("sha256").update(`${email}:${code}`).digest("hex");

// Its own signing key (derived from JWT_SECRET), so an email proof can never
// be mistaken for a login token and vice versa.
const emailProofSecret = () =>
  crypto.createHmac("sha256", env.JWT_SECRET).update("email-verification").digest("hex");

export async function sendEmailCode(email: string): Promise<void> {
  if (env.NODE_ENV !== "development" && (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD)) {
    throw new AppError("Email verification is not available right now. Please verify with your mobile number.", 503);
  }
  if (await User.exists({ email })) throw new AppError("Email already registered", 409);

  // One code per 30 seconds…
  const waitSet = await redis.set(emailWaitKey(email), "1", "EX", EMAIL_CODE_RESEND_SECONDS, "NX");
  if (!waitSet) {
    const ttl = await redis.ttl(emailWaitKey(email));
    throw new AppError(`Please wait ${Math.max(1, ttl)} seconds before asking for a new code.`, 429);
  }
  // …and a few per hour, so nobody can flood an inbox.
  const sends = await redis.incr(emailSendsKey(email));
  if (sends === 1) await redis.expire(emailSendsKey(email), EMAIL_CODE_SENDS_WINDOW);
  if (sends > EMAIL_CODE_MAX_SENDS) {
    throw new AppError("Too many codes sent to this email. Please try again in an hour.", 429);
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await redis.setex(emailCodeKey(email), EMAIL_CODE_TTL_SECONDS, hashEmailCode(email, code));
  await redis.del(emailTriesKey(email));

  try {
    await sendEmail({
      to: email,
      subject: `${code} is your Nitya Samagri verification code`,
      text: `Your Nitya Samagri verification code is ${code}. It expires in 10 minutes. If you did not ask for it, you can ignore this email.`,
      html:
        `<p>Your Nitya Samagri verification code is:</p>` +
        `<p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#071C42">${code}</p>` +
        `<p>It expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>`,
    });
  } catch (err) {
    await redis.del(emailCodeKey(email), emailWaitKey(email));
    logger.error(`Sign-up code email to ${email} failed: ${err instanceof Error ? err.message : err}`);
    throw new AppError("We couldn't send the email. Please try again or verify with your mobile number.", 502);
  }

  // In development sendEmail() only logs, so show the code in the log.
  if (env.NODE_ENV === "development") logger.info(`[EMAIL CODE] ${email}: ${code}`);
}

export async function verifyEmailCode({ email, code }: EmailOtpVerifyInput) {
  const stored = await redis.get(emailCodeKey(email));
  if (!stored) throw new AppError("That code has expired. Please ask for a new one.", 400);

  const tries = await redis.incr(emailTriesKey(email));
  if (tries === 1) await redis.expire(emailTriesKey(email), EMAIL_CODE_TTL_SECONDS);
  if (tries > EMAIL_CODE_MAX_TRIES) {
    await redis.del(emailCodeKey(email), emailTriesKey(email));
    throw new AppError("Too many wrong codes. Please ask for a new one.", 429);
  }

  const given = Buffer.from(hashEmailCode(email, code));
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, Buffer.from(stored))) {
    throw new AppError("That code is incorrect.", 400);
  }

  await redis.del(emailCodeKey(email), emailTriesKey(email));
  const emailToken = jwt.sign({ email, type: "email_verified" }, emailProofSecret(), {
    expiresIn: EMAIL_PROOF_EXPIRES_IN,
  });
  return { emailToken };
}

/** The email address an emailToken proves, or an error if it is not valid. */
function readEmailProof(emailToken: string): string {
  try {
    const decoded = jwt.verify(emailToken, emailProofSecret(), { algorithms: ["HS256"] }) as {
      email?: string;
      type?: string;
    };
    if (decoded.type === "email_verified" && decoded.email) return decoded.email;
  } catch {
    // fall through
  }
  throw new AppError("Your email verification has expired. Please verify your email again.", 400);
}

// ── Sign-up ───────────────────────────────────────────────────────────────────

/**
 * Create a customer account. The mobile number (Firebase OTP) or the email
 * (emailed code) must have been proven first; the new account is signed in.
 */
export async function register(input: RegisterInput) {
  const { name, phone, password, idToken, emailToken } = input;
  const email = input.email?.toLowerCase();

  let phoneProof: { firebaseUid: string } | null = null;
  if (idToken) {
    const otp = await verifyOtpToken(idToken);
    if (otp.phone !== phone) throw new AppError("The verified phone number does not match", 400);
    phoneProof = { firebaseUid: otp.firebaseUid };
  }

  let emailVerified = false;
  if (emailToken) {
    if (!email || readEmailProof(emailToken) !== email) {
      throw new AppError("The verified email does not match", 400);
    }
    emailVerified = true;
  }

  if (!phoneProof && !emailVerified) {
    throw new AppError("Please verify your mobile number or email before creating an account.", 400);
  }

  if (await User.exists({ phone })) throw new AppError("Phone number already registered", 409);
  if (email && (await User.exists({ email }))) throw new AppError("Email already registered", 409);

  const user = await User.create({
    name,
    phone,
    email,
    password: await bcrypt.hash(password, 12),
    role: "customer",
    // isVerified stays about the phone: an email-verified account whose
    // number was never proven still has its password cleared by the real
    // owner's first OTP login (see loginWithOtp).
    isVerified: !!phoneProof,
    emailVerified,
    firebaseUid: phoneProof?.firebaseUid,
    loyaltyPoints: WELCOME_POINTS,
  });

  const tokens = await startSession(String(user._id), user.role);
  return { user: publicUser(user), ...tokens };
}

// ── Password login ────────────────────────────────────────────────────────────

export async function login(input: LoginInput) {
  const identifier   = input.phone || input.email!.toLowerCase();
  const isStaffLogin = !!input.email;

  // Lock-out after repeated wrong passwords, counted per phone/email
  const lockKey = `login_lock:${identifier}`;
  const failKey = `login_fails:${identifier}`;

  if (await redis.get(lockKey)) {
    const ttl = await redis.ttl(lockKey);
    throw new AppError(
      `Too many failed login attempts. Please try again in ${Math.max(1, Math.ceil(ttl / 60))} minute(s).`,
      429
    );
  }

  async function fail(message = "Invalid credentials"): Promise<never> {
    const fails = await redis.incr(failKey);
    if (fails === 1) await redis.expire(failKey, LOGIN_ATTEMPT_WINDOW_SECONDS);

    if (fails >= MAX_LOGIN_ATTEMPTS) {
      await redis.setex(lockKey, LOGIN_LOCKOUT_SECONDS, "1");
      await redis.del(failKey);
      throw new AppError(
        `Too many failed login attempts. Please try again in ${Math.ceil(LOGIN_LOCKOUT_SECONDS / 60)} minute(s).`,
        429
      );
    }
    throw new AppError(message, 401);
  }

  const user = await User.findOne(isStaffLogin ? { email: identifier } : { phone: identifier }).select("+password");

  if (!user) return fail();
  if (user.status === "blocked") throw new AppError("Account has been blocked. Contact support.", 403);
  if (isStaffLogin && !STAFF_LOGIN_ROLES.includes(user.role)) {
    return fail("This account is not authorized for staff login.");
  }
  if (!user.password) {
    return fail("This account uses OTP login. Please log in with an OTP instead of a password.");
  }
  if (!(await bcrypt.compare(input.password, user.password))) return fail();

  await redis.del(failKey);
  await redis.del(lockKey);

  const tokens = await startSession(String(user._id), user.role);
  user.lastLoginAt = new Date();
  await user.save();

  return { user: publicUser(user), ...tokens };
}

// ── Phone OTP login ───────────────────────────────────────────────────────────

/**
 * Sign in with a Firebase phone-OTP token. A new phone number gets a new
 * customer account.
 *
 * Proving the phone number also settles who owns an account whose phone was
 * never proven (older password sign-ups, or sign-ups verified by email
 * only): that password may have been set by someone else. The first OTP sign-in
 * therefore removes it, and the account continues with OTP login.
 */
export async function loginWithOtp(idToken: string) {
  const { phone, firebaseUid } = await verifyOtpToken(idToken);

  let user = await User.findOne({ phone }).select("+password");
  const isNewUser = !user;

  if (!user) {
    user = await User.create({
      phone,
      firebaseUid,
      role: "customer",
      isVerified: true,
      loyaltyPoints: WELCOME_POINTS,
      name: "New User",
    });
  } else {
    if (user.status === "blocked") throw new AppError("Account has been blocked. Contact support.", 403);

    if (!user.isVerified && user.password) user.password = undefined;
    user.isVerified  = true;
    user.firebaseUid = firebaseUid;
    user.lastLoginAt = new Date();
    await user.save();
  }

  const tokens = await startSession(String(user._id), user.role);
  return {
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    ...tokens,
    isNewUser,
  };
}

// ── Refresh / logout ──────────────────────────────────────────────────────────

/**
 * Swap a refresh token for a new pair. The person is looked up again each
 * time, so a blocked account cannot renew, and a changed role is picked up.
 */
export async function refresh(refreshToken: string) {
  let decoded: { userId: string; type?: string };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, { algorithms: ["HS256"] }) as typeof decoded;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "refresh") throw new AppError("Invalid or expired refresh token", 401);

  const stored = await redis.get(refreshKey(decoded.userId));
  if (!stored || stored !== refreshToken) throw new AppError("Refresh token revoked", 401);

  const user = await User.findById(decoded.userId).select("role status").lean();
  if (!user || user.status !== "active") {
    await revokeSessions(decoded.userId);
    throw new AppError("Account is not active", 401);
  }

  return startSession(decoded.userId, user.role);
}

export function logout(userId: string) {
  return revokeSessions(userId);
}

// ── Own profile ───────────────────────────────────────────────────────────────

const PROFILE_FIELDS = "name phone email role isVerified loyaltyPoints loyaltyTier createdAt lastLoginAt permissions";

// The return type is written out (as plain `object`) because the build also
// writes type files, and TypeScript cannot write out the very long type it
// would otherwise work out for a database record.
export async function getProfile(userId: string): Promise<object> {
  const user = await User.findById(userId).select(PROFILE_FIELDS).lean();
  if (!user) throw new AppError("User not found", 404);

  // Staff get the permissions they actually hold, so the admin panel can
  // show the right menu; customers have none.
  const permissions = user.role === "customer" ? [] : effectivePermissions(user);
  return { ...user, permissions };
}

/** A person edits their own name or email. Staff emails are their login, so those stay fixed. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<object> {
  const user = await User.findById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (input.name !== undefined) user.name = input.name;

  if (input.email !== undefined) {
    const email = input.email.toLowerCase();
    if (user.role !== "customer" && email !== user.email) {
      throw new AppError("A staff email can only be changed by the super admin", 403);
    }
    if (email !== user.email && (await User.exists({ email, _id: { $ne: user._id } }))) {
      throw new AppError("Email already registered", 409);
    }
    user.email = email;
  }

  await user.save();
  return getProfile(userId);
}