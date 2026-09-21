import Image from "next/image";
import { notFound } from "next/navigation";
import { formatMoney } from "@/app/lib/money";
import { AddToCartForm } from "@/app/components/AddToCartForm";
import { getProductBySlug, listActiveProductSlugs } from "@/app/lib/products";

export async function generateStaticParams() {
  return await listActiveProductSlugs();
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Not found | My Store" };

  return {
    title: `${product.name} | My Store`,
    description: product.description,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) notFound();

  const inStock = product.stock > 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="relative aspect-square overflow-hidden rounded-card bg-paper-sunken">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            fetchPriority="high"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-xl tabular-nums">
          {formatMoney(product.priceCents, product.currency)}
        </p>
        <p className="text-ink-muted">{product.description}</p>
        <p className="text-sm text-ink-faint">
          {inStock ? `${product.stock} in stock` : "Out of stock"}
        </p>
        <AddToCartForm productId={product.id} maxQuantity={product.stock} />
      </div>
    </div>
  );
}
