import { Request, Response } from "express";
import { errorHandler } from "../../src/middlewares/error.middleware";
import { AppError } from "../../src/utils/AppError";

function run(err: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  errorHandler(err as Error, {} as Request, res as unknown as Response, jest.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
}

describe("errorHandler", () => {
  it("returns an AppError's own status, message and field errors", () => {
    const { status, body } = run(new AppError("Validation failed", 400, [{ field: "phone", message: "Invalid" }]));
    expect(status).toBe(400);
    expect(body).toMatchObject({ success: false, message: "Validation failed", errors: [{ field: "phone", message: "Invalid" }] });
  });

  it("turns a malformed MongoDB ID into a 400", () => {
    const { status, body } = run(Object.assign(new Error("Cast failed"), { name: "CastError", path: "_id" }));
    expect(status).toBe(400);
    expect(body.message).toBe("Invalid ID");
  });

  it("turns a Mongoose validation error into a 400 with field errors", () => {
    const err = Object.assign(new Error("bad"), {
      name: "ValidationError",
      errors: { name: { path: "name", message: "Path `name` is required." } },
    });
    const { status, body } = run(err);
    expect(status).toBe(400);
    expect(body.errors).toEqual([{ field: "name", message: "Path `name` is required." }]);
  });

  it("turns a duplicate-key error into a 409", () => {
    const { status, body } = run(Object.assign(new Error("E11000"), { code: 11000, keyValue: { slug: "ghee" } }));
    expect(status).toBe(409);
    expect(body.message).toMatch(/slug already exists/);
  });

  it("turns a broken JSON body into a 400", () => {
    const { status } = run(Object.assign(new Error("Unexpected token"), { type: "entity.parse.failed" }));
    expect(status).toBe(400);
  });

  it("hides the details of an unexpected error behind a 500", () => {
    const { status, body } = run(new Error("db password is hunter2"));
    expect(status).toBe(500);
    expect(body.message).toBe("Internal server error");
  });
});
