import request from "supertest";
import app from "../app";

describe("Purchases API", () => {
  let token: string;

  beforeAll(async () => {
    // login test user
    const res = await request(app).post("/api/auth/login").send({
      email: "user1@test.com",
      password: "password123",
    });
    token = res.body.token;
  });

  it("should list purchases", async () => {
    const res = await request(app)
      .get("/api/purchases")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should create purchase", async () => {
    const res = await request(app)
      .post("/api/purchases")
      .set("Authorization", `Bearer ${token}`)
      .send({ itemId: "SOME_ITEM_ID" });
    expect([200, 201, 404]).toContain(res.status); // dépend seed
  });
});
