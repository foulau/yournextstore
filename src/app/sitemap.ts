import { publicUrl } from "@/env.mjs";
import StoreConfig from "@/store.config";
import * as Commerce from "commerce-kit";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	// Always include the base URL and categories
	const baseUrls: MetadataRoute.Sitemap = [
		{
			url: publicUrl,
			lastModified: new Date(),
			changeFrequency: "always" as const,
			priority: 1,
		},
	];

	// Handle categories safely
	const categoryUrls = StoreConfig.categories
		.filter((category) => category.slug && typeof category.slug === 'string')
		.map((category) => ({
			url: `${publicUrl}/category/${category.slug}`,
			lastModified: new Date(),
			changeFrequency: "daily" as const,
			priority: 0.5,
		}));

	// Try to get products, but handle any errors gracefully
	let productUrls: MetadataRoute.Sitemap = [];
	
	try {
		const products = await Commerce.productBrowse({ first: 100 });
		
		if (Array.isArray(products)) {
			const validProducts = products.filter((product) => {
				try {
					// Validate each product thoroughly
					return (
						product &&
						typeof product === 'object' &&
						product.metadata &&
						typeof product.metadata === 'object' &&
						product.metadata.slug &&
						typeof product.metadata.slug === 'string' &&
						product.metadata.slug.trim() !== '' &&
						typeof product.updated === 'number'
					);
				} catch (err) {
					console.warn('Error validating product:', err);
					return false;
				}
			});

			const mappedProducts = validProducts
				.map((product) => {
					try {
						return {
							url: `${publicUrl}/product/${product.metadata.slug}`,
							lastModified: new Date(product.updated * 1000),
							changeFrequency: "daily" as const,
							priority: 0.8,
						};
					} catch (err) {
						console.warn('Error mapping product to sitemap entry:', err);
						return null;
					}
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);

			productUrls = mappedProducts;
		}
		
		console.log(`Successfully processed ${productUrls.length} products for sitemap`);
		
	} catch (error) {
		console.error('Error fetching products for sitemap:', error);
		// Continue without products if there's an error
	}

	return [
		...baseUrls,
		...categoryUrls,
		...productUrls,
	];
}