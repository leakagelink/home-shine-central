import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus, Clock } from "lucide-react";

import { categoryDetailQuery } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/_authenticated/app/book/$category")({
  head: () => ({
    meta: [
      { title: "Build your cleaning — SqueakClean" },
      {
        name: "description",
        content: "Pick services and add-ons at fixed prices, then choose a slot that suits you.",
      },
      { property: "og:title", content: "Build your cleaning — SqueakClean" },
      { property: "og:description", content: "Pick services and add-ons at fixed prices." },
    ],
  }),
  component: BookCategory,
});

function BookCategory() {
  const { category } = useParams({ from: "/_authenticated/app/book/$category" });
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(categoryDetailQuery(category));
  const cart = useCart();

  if (isLoading) {
    return <p className="p-8 text-sm text-muted-foreground">Loading services…</p>;
  }
  if (!data) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">That service group isn't available.</p>
        <Link to="/app" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to home
        </Link>
      </div>
    );
  }

  const otherCategoryInCart = cart.categorySlug && cart.categorySlug !== category;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-40">
      <header className="px-4 sm:px-5 pt-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Home
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{data.category.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.category.tagline}</p>
      </header>

      {otherCategoryInCart && (
        <p className="mx-5 mt-4 rounded-xl bg-accent/20 px-3 py-2 text-xs">
          Your basket has items from another service group. Clear it to mix a new one.{" "}
          <button onClick={cart.clear} className="font-semibold underline">
            Clear basket
          </button>
        </p>
      )}

      <main className="flex-1 px-4 sm:px-5">
        <section className="mt-6 space-y-3">
          {data.services.map((s) => {
            const qty = cart.quantityOf(s.id);
            return (
              <article key={s.id} className="surface flex items-start gap-3 p-4">
                <div className="flex-1">
                  <h2 className="text-sm font-semibold">{s.name}</h2>
                  {s.description && (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="text-sm font-bold text-foreground">
                      {rupees(s.price_paise)}
                    </span>
                    {s.duration_minutes && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {s.duration_minutes}{" "}
                        min
                      </span>
                    )}
                  </p>
                </div>
                {qty === 0 ? (
                  <button
                    type="button"
                    disabled={Boolean(otherCategoryInCart)}
                    onClick={() =>
                      cart.setQuantity(
                        {
                          id: s.id,
                          kind: "service",
                          name: s.name,
                          pricePaise: s.price_paise,
                          categorySlug: category,
                        },
                        1,
                      )
                    }
                    className="animate-pop rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-secondary px-2 py-1.5">
                    <button
                      type="button"
                      aria-label={`Remove one ${s.name}`}
                      onClick={() =>
                        cart.setQuantity(
                          {
                            id: s.id,
                            kind: "service",
                            name: s.name,
                            pricePaise: s.price_paise,
                            categorySlug: category,
                          },
                          qty - 1,
                        )
                      }
                    >
                      <Minus className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
                    </button>
                    <span className="w-4 text-center text-sm font-bold text-secondary-foreground">
                      {qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one ${s.name}`}
                      onClick={() =>
                        cart.setQuantity(
                          {
                            id: s.id,
                            kind: "service",
                            name: s.name,
                            pricePaise: s.price_paise,
                            categorySlug: category,
                          },
                          Math.min(qty + 1, s.max_quantity ?? 10),
                        )
                      }
                    >
                      <Plus className="h-4 w-4 text-secondary-foreground" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>

        {data.addons.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Add-ons
            </h2>
            <div className="mt-3 space-y-2">
              {data.addons.map((a) => {
                const qty = cart.quantityOf(a.id);
                return (
                  <label
                    key={a.id}
                    className="surface flex cursor-pointer items-center justify-between gap-3 p-4"
                  >
                    <span>
                      <span className="block text-sm font-semibold">{a.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {rupees(a.price_paise)}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[var(--pine)]"
                      checked={qty > 0}
                      disabled={Boolean(otherCategoryInCart)}
                      onChange={(e) =>
                        cart.setQuantity(
                          {
                            id: a.id,
                            kind: "addon",
                            name: a.name,
                            pricePaise: a.price_paise,
                            categorySlug: category,
                          },
                          e.target.checked ? 1 : 0,
                        )
                      }
                    />
                  </label>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {cart.itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 sm:px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">
                {cart.itemCount} item{cart.itemCount > 1 ? "s" : ""}
              </p>
              <p className="text-lg font-bold">{rupees(cart.total)}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/app/checkout" })}
              className="rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground"
            >
              Choose slot
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
