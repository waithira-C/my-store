import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { getCartItemCount } from "@/app/lib/cart";
import { getCurrentUser } from "@/app/lib/session";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [user, cartCount] = await Promise.all([
    getCurrentUser(),
    getCartItemCount(),
  ]);

  return (
    <>
      {/* backdrop-blur is safe here: the fixed filter dock lives inside <main>,
          not inside this header, so this never becomes its containing block. */}
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/85 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-4">
          <Link href="/" className="font-display text-title">
            My Store
          </Link>
          <Link
            href="/products"
            className="text-body-sm text-ink-muted transition-colors hover:text-ink"
          >
            Products
          </Link>
          <div className="ml-auto flex items-center gap-4 text-body-sm">
            {/* CONTRACT: the count must stay inside this link as text, in (n)
                form -- the suite asserts toContainText("(2)"), which an
                icon plus aria-label would fail. */}
            <Link
              href="/cart"
              className="text-ink-muted transition-colors hover:text-ink"
            >
              Cart{cartCount > 0 && ` (${cartCount})`}
            </Link>
            {user ? (
              <>
                <Link
                  href="/account/orders"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Orders
                </Link>
                {/* Only rendered for signed-in users. It must stay that way:
                    the PDP stock test does document.querySelector("form") and
                    relies on the add-to-cart form being the first one. */}
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="cursor-pointer text-ink-muted transition-colors hover:text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/signIn"
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-rule py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4">
          <p className="font-display text-title text-ink">My Store</p>
          <p className="text-body-sm text-ink-faint">
            &copy; {new Date().getFullYear()} &middot; Mugs, prints and
            stationery.
          </p>
        </div>
      </footer>
    </>
  );
}
