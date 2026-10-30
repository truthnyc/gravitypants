import { describe, expect, it, vi } from "vitest";
import { deliverSupportReply, supportReplyInput } from "../src/lib/stillframe/support-reply";

const actions = () => ({ send: vi.fn(async () => ({ sent: true })), saveDelivery: vi.fn(async () => {}), markAnswered: vi.fn(async () => {}) });

describe("support reply delivery", () => {
  it("marks answered only after email acceptance is saved", async () => {
    const a = actions();
    await deliverSupportReply("pending", a);
    expect(a.saveDelivery).toHaveBeenCalledWith("sent");
    expect(a.markAnswered).toHaveBeenCalledOnce();
    expect(a.saveDelivery.mock.invocationCallOrder[0]).toBeLessThan(a.markAnswered.mock.invocationCallOrder[0]);
  });
  it("does not send an already sent reply again", async () => {
    const a = actions();
    await deliverSupportReply("sent", a);
    expect(a.send).not.toHaveBeenCalled();
    expect(a.markAnswered).toHaveBeenCalledOnce();
  });
  it("records failure without marking answered", async () => {
    const a = actions();
    a.send.mockRejectedValue(new Error("Unavailable"));
    await expect(deliverSupportReply("pending", a)).rejects.toThrow("reply is saved");
    expect(a.saveDelivery).toHaveBeenCalledWith("failed");
    expect(a.markAnswered).not.toHaveBeenCalled();
  });
  it("honours suppression without retrying or marking answered", async () => {
    const a = actions();
    a.send.mockResolvedValue({ sent: false });
    expect(await deliverSupportReply("pending", a)).toEqual({ sent: false });
    expect(a.saveDelivery).toHaveBeenCalledWith("suppressed");
    expect(a.markAnswered).not.toHaveBeenCalled();
    a.send.mockClear();
    await deliverSupportReply("suppressed", a);
    expect(a.send).not.toHaveBeenCalled();
  });
  it("rejects blank messages and accepts trimmed replies", () => {
    const base = { id: "11111111-1111-4111-8111-111111111111", replyId: "22222222-2222-4222-8222-222222222222" };
    expect(supportReplyInput.safeParse({ ...base, message: "  " }).success).toBe(false);
    expect(supportReplyInput.parse({ ...base, message: " Reply " }).message).toBe("Reply");
  });
});