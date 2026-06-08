import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe needs the Node runtime (not edge) and the raw request body.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured on the server" }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });

  // Raw body is required for signature verification.
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // ── New subscription purchased via the Payment Link ──
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        // Only act on subscription checkouts that are actually paid.
        if (s.mode && s.mode !== "subscription") break;
        if (s.payment_status && s.payment_status === "unpaid") break;

        const userId = s.client_reference_id || null;
        const email = s.customer_details?.email || s.customer_email || null;
        const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id || null;
        const subscriptionId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id || null;

        // Find the app user: prefer client_reference_id (the logged-in user id), fall back to email.
        let target: { id: string } | null = null;
        if (userId) {
          const { data } = await supabase.from("users").select("id").eq("id", userId).maybeSingle();
          target = data;
        }
        if (!target && email) {
          const { data } = await supabase.from("users").select("id").ilike("email", email).maybeSingle();
          target = data;
        }

        if (!target) {
          // Payment succeeded but we can't match an account — log and ack so Stripe stops retrying.
          console.warn("[stripe] checkout.session.completed: no matching user", { email, userId });
          break;
        }

        await supabase.from("users").update({
          is_pro: true,
          pro_since: new Date().toISOString(),
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        }).eq("id", target.id);

        await supabase.from("notifications").insert({
          user_id: target.id,
          type: "RANK_PROMOTION",
          title: "APEX TIMING PRO active",
          message: "Your PRO subscription is live — all cars, tracks, telemetry and the PRO badge are unlocked. Thanks for the support! ⚡",
          data: { pro_granted: true, source: "stripe" },
        });
        break;
      }

      // ── Recurring renewal succeeded — keep PRO on ──
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id || null;
        if (customerId) {
          await supabase.from("users").update({ is_pro: true }).eq("stripe_customer_id", customerId);
        }
        break;
      }

      // ── Subscription canceled / lapsed / updated ──
      case "customer.subscription.deleted":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const active = sub.status === "active" || sub.status === "trialing";

        const { data: u } = await supabase
          .from("users")
          .select("id, team_rank")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (u) {
          if (active) {
            await supabase.from("users").update({ is_pro: true }).eq("id", u.id);
          } else {
            // Race Directors keep PRO for free even if their paid sub ends.
            const keepPro = (u.team_rank ?? 0) >= 2;
            await supabase.from("users").update({
              is_pro: keepPro,
              stripe_subscription_id: null,
            }).eq("id", u.id);

            if (!keepPro) {
              await supabase.from("notifications").insert({
                user_id: u.id,
                type: "RANK_CHANGE",
                title: "PRO subscription ended",
                message: "Your APEX TIMING PRO subscription has ended. Resubscribe anytime from the PRO page to restore your features.",
                data: { pro_granted: false, source: "stripe" },
              });
            }
          }
        }
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe doesn't retry.
        break;
    }
  } catch (err: any) {
    console.error("[stripe] handler error", event.type, err?.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
