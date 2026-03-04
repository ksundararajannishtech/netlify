import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from 'react-router';
import {getPaginationVariables, Image, Money} from '@shopify/hydrogen';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {ProductItem} from '~/components/ProductItem';
import type {CollectionItemFragment} from 'storefrontapi.generated';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';
import {useEffect, useState} from 'react';
const FALLBACK_PRICE: MoneyV2 = {
  amount: '00.00',
  currencyCode: 'INR',
};
interface PricingData {
  price: number;
  currency: string;
}
interface PricingAPIResponse {
  // Single SKU response
  sku?: string;
  price?: number;
  currency?: string;
  customer_id?: string;
  timestamp?: string;

  // Multiple SKUs response
  results?: Array<{
    sku: string;
    price: number;
    currency: string;
  }>;
  total_skus?: number;
  successful?: number;
  failed?: number;
}
export const meta: MetaFunction<typeof loader> = () => {
  return [{title: `Hydrogen | Products`}];
};

export async function loader(args: LoaderFunctionArgs) {
  const {session, env} = args.context;
  const erpConfig = session.get('erpConfig');
  const enableRealTimePricing = session.get('enableRealTimePricing');
  const pricingUrl = session.get('pricingUrl');
  const timeout = session.get('timeout');
  console.log('111', erpConfig);
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);
  //console.log('111', erpConfig);
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(
    args,
    pricingUrl,
    timeout,
    enableRealTimePricing,
  );

  return {...deferredData, ...criticalData};
}
function parsePricingResponse(
  data: PricingAPIResponse,
): Map<string, PricingData> {
  const pricingMap = new Map<string, PricingData>();
  // Single SKU response
  if (data.sku && data.price !== undefined && data.currency) {
    pricingMap.set(data.sku, {
      price: data.price,
      currency: data.currency,
    });
    return pricingMap;
  }
  // Multiple SKUs response
  if (data.results && Array.isArray(data.results)) {
    data.results.forEach((item) => {
      if (item.sku && item.price !== undefined && item.currency) {
        pricingMap.set(item.sku, {
          price: item.price,
          currency: item.currency,
        });
      }
    });

    // Log if some SKUs failed
    if (data.failed && data.failed > 0) {
      console.warn(`${data.failed} SKU(s) failed to fetch pricing`);
    }
  }
  return pricingMap;
}
async function fetchProductPricing(
  skus: string,
  customerId: string,
  PRICING_API_URL: string,
  PRICING_TIMEOUT: any,
): Promise<Map<string, PricingData>> {
  const startTime = Date.now();

  try {
    const url = `https://shopifyerpintegrationappserviceapi-frdye4bba2f5hsck.eastus2-01.azurewebsites.net/api/proxy/price?sku=${encodeURIComponent(
      skus,
    )}&customer_id=${customerId}`;
    console.log(url);
    console.log(PRICING_TIMEOUT);
    const response = await fetch(url, {
      headers: {'Content-Type': 'application/json'},
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      throw new Error(`Pricing API returned ${response.status}`);
    }
    const data = (await response.json()) as PricingAPIResponse;
    const pricingMap = parsePricingResponse(data);

    const duration = Date.now() - startTime;
    const cacheStatus = response.headers.get('X-Cache');

    console.log(
      `Pricing loaded: ${pricingMap.size} SKU(s) in ${duration}ms (Cache: ${
        cacheStatus || 'UNKNOWN'
      })`,
    );

    return pricingMap;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Pricing fetch failed after ${duration}ms:`, error);
    return new Map();
  }
}
function applyPricingToProduct(
  product: any,
  pricingMap: Map<string, PricingData>,
  fallback: MoneyV2,
): any {
  const sku = product.handle;
  const pricing = pricingMap.get(sku);
  let price: MoneyV2;
  if (pricing) {
    price = {
      amount: pricing.price.toFixed(2),
      currencyCode: pricing.currency as any,
    };
  } else {
    price = {...fallback};
    console.warn(`No pricing for SKU: ${sku}`);
  }
  return {
    ...product,
    priceRange: {
      minVariantPrice: price,
      maxVariantPrice: price,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData(
  {context, request}: LoaderFunctionArgs,
  PRICING_API_URL: string,
  PRICING_TIMEOUT: any,
  enableRealTimePricing: any,
) {
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {pageBy: 8});
  // Fetch products
  const [{products}] = await Promise.all([
    storefront.query(CATALOG_QUERY, {variables: {...paginationVariables}}),
  ]);
  if (enableRealTimePricing && PRICING_API_URL) {
    console.log(`Real Time pricing`);
    // Get customer ID from session
    const customerId = 'NTOPTI001';
    // Build SKU list
    const skus = products.nodes.map((p) => p.handle).join(',');
    // Fetch real-time pricing
    const pricingMap = await fetchProductPricing(
      skus,
      customerId,
      PRICING_API_URL,
      PRICING_TIMEOUT,
    );
    // Apply pricing to products
    products.nodes = products.nodes.map((product) =>
      applyPricingToProduct(product, pricingMap, FALLBACK_PRICE),
    );
    console.log(`Loaded ${products.nodes.length} products with pricing`);
  } else {
    console.log(`Shopify pricing`);
  }
  return {products};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  return {};
}

export default function Collection() {
  const {products} = useLoaderData<typeof loader>();

  return (
    <div className="collection">
      <p className="ml-[35px] mt-5">Shopify Product List</p>
      <PaginatedResourceSection<CollectionItemFragment>
        connection={products}
        resourcesClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4 px-8"
      >
        {({node: product, index}) => (
          <ProductItem
            key={product.id}
            product={product}
            loading={index < 8 ? 'eager' : undefined}
          />
        )}
      </PaginatedResourceSection>
    </div>
  );
}

const COLLECTION_ITEM_FRAGMENT = `#graphql
  fragment MoneyCollectionItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment CollectionItem on Product {
    id
    handle
    title
    description
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyCollectionItem
      }
      maxVariantPrice {
        ...MoneyCollectionItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/product
const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...CollectionItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${COLLECTION_ITEM_FRAGMENT}
` as const;
