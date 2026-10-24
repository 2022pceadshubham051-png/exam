import { Router } from "express";
import { prisma } from "../lib/db"; import { requireAuth, type AuthedReq } from "../middleware/auth";
import { ITEMS, byId, readInv, isConsumable } from "../services/shopCatalog";
import { award, balance, syncEarnings, dayKey, DAILY_COINS } from "../services/coins";

export const shop = Router();
shop.use(requireAuth);

async function state(userId: string) {
  await syncEarnings(userId);
  const [coins, u, claimed] = await Promise.all([balance(userId), prisma.user.findUnique({ where: { id: userId }, select: { inventory: true } }),
    prisma.coinTx.findUnique({ where: { userId_reason_ref: { userId, reason: "daily", ref: dayKey() } } })]);
  return { coins, inventory: readInv(u?.inventory), dailyAvailable: !claimed, dailyCoins: DAILY_COINS, items: ITEMS };
}
shop.get("/shop", async (req: AuthedReq, res) => res.json(await state(req.user!.id)));
shop.get("/coins", async (req: AuthedReq, res) => { await syncEarnings(req.user!.id); res.json({ coins: await balance(req.user!.id) }); });

shop.post("/shop/daily", async (req: AuthedReq, res) => {
  const ok = await award(req.user!.id, DAILY_COINS, "daily", dayKey());
  if (!ok) return res.status(409).json({ error: "You already claimed today's coins. Come back tomorrow!" });
  res.json(await state(req.user!.id));
});

shop.post("/shop/buy", async (req: AuthedReq, res) => {
  const item = byId.get(String(req.body?.itemId)); if (!item) return res.status(404).json({ error: "That item does not exist." });
  const userId = req.user!.id; await syncEarnings(userId);
  const out = await prisma.$transaction(async (tx) => {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { inventory: true } });
    const inv = readInv(u?.inventory);
    if (!isConsumable(item.kind) && inv.owned.includes(item.id)) return { err: "You already own this." };
    if (item.kind === "freeze" && inv.freezes >= 5) return { err: "You can hold at most 5 streak freezes." };
    if (item.kind === "lifeline" && inv.lifelines >= 50) return { err: "You can hold at most 50 lifelines." };
    const sum = await tx.coinTx.aggregate({ where: { userId }, _sum: { amount: true } });
    if ((sum._sum.amount ?? 0) < item.price) return { err: "Not enough coins yet. Take a test or claim your daily coins!" };
    await tx.coinTx.create({ data: { userId, amount: -item.price, reason: "buy", ref: `${item.id}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` } });
    if (item.kind === "lifeline") inv.lifelines += 1;
    else if (item.kind === "freeze") inv.freezes += 1;
    else { inv.owned.push(item.id); inv.equipped = { ...inv.equipped, [item.kind]: item.id }; } // equip right away
    await tx.user.update({ where: { id: userId }, data: { inventory: inv as any } });
    return {};
  }, { isolationLevel: "Serializable" });
  if ((out as any).err) return res.status(400).json({ error: (out as any).err });
  res.json(await state(userId));
});

shop.post("/shop/equip", async (req: AuthedReq, res) => {
  const kind = String(req.body?.kind), id = req.body?.itemId == null ? null : String(req.body.itemId);
  if (kind !== "title" && kind !== "frame") return res.status(400).json({ error: "Invalid slot." });
  const u = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { inventory: true } }), inv = readInv(u?.inventory);
  if (id !== null && (!inv.owned.includes(id) || byId.get(id)?.kind !== kind)) return res.status(400).json({ error: "You do not own that item." });
  inv.equipped = { ...inv.equipped, [kind]: id ?? undefined };
  await prisma.user.update({ where: { id: req.user!.id }, data: { inventory: inv as any } });
  res.json(await state(req.user!.id));
});
