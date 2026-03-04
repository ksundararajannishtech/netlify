import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData, Link, type MetaFunction} from 'react-router';
import {Suspense} from 'react';
import {HeroBanner} from '~/components/HeroBanner';
import type {
  GetLuxuryshineContentByHandleQuery,
  RecommendedProductsQuery,
  GetLuxuryshineContentByHandleQueryVariables,
  GetHeroBannerByHandleQueryVariables,
  GetHeroBannerByHandleQuery,
} from 'storefrontapi.generated';
import type {GetLuxuryshineContentQuery} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {
  HERO_BANNER_QUERY,
  HERO_BANNER_QUERY_BY_HANDLE,
} from '~/graphql/meta-objects/HeroBannerQuery';
import {
  FeaturedCollections,
  FEATURED_COLLECTION_QUERY,
} from '~/components/FeaturedCollections';
import JustLandedSection from '~/components/JustLanded';
import {LuxuryShine} from '~/components/LuxuryShine';
import EventReady from '~/components/EventReady';
import {LUXURY_SHINE_QUERY_BY_HANDLE} from '~/graphql/meta-objects/LuxuryShineQuery';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

interface PricingInformation {
  id: string;
  enableRealTimePricing: boolean;
  connectionName: string;
  pricingUrl: string;
  timeout: number;
  retryCount: number;
  authType: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

type ErpRealTimeResponse = {
  result: PricingInformation;
};

// Define the loader data type explicitly
type LoaderData = {
  featuredCollections: Awaited<
    ReturnType<typeof loadCriticalData>
  >['featuredCollections'];
  recommendedProducts: ReturnType<
    typeof loadDeferredData
  >['recommendedProducts'];
  heroBanner: ReturnType<typeof loadDeferredData>['heroBanner'];
  luxuryshinecollections: ReturnType<
    typeof loadDeferredData
  >['luxuryshinecollections'];
  justlanded: ReturnType<typeof loadDeferredData>['justlanded'];
  eventready: ReturnType<typeof loadDeferredData>['eventready'];
  erpData: ErpRealTimeResponse;
};

export async function loader(args: LoaderFunctionArgs) {
  const {session} = args.context;

  // Start loading deferred data (don't await)
  const deferredData = loadDeferredData(args);

  // Load critical data (await this)
  const criticalData = await loadCriticalData(args);

  // Fetch ERP data
  const response = await fetch(
    'https://shopifyerpintegrationappserviceapi-frdye4bba2f5hsck.eastus2-01.azurewebsites.net/api/pricing/specx-qa.myshopify.com/getpricinginformation',
  );

  if (!response.ok) {
    throw new Error('Failed to call ERP API');
  }

  const erpData = (await response.json()) as ErpRealTimeResponse;

  // Store entire config in session
  session.set('erpConfig', erpData?.result);

  // Store individual values
  session.set(
    'enableRealTimePricing',
    erpData?.result?.enableRealTimePricing ?? false,
  );
  session.set('pricingUrl', erpData?.result?.pricingUrl);
  session.set('timeout', erpData?.result?.timeout);

  // Commit session first
  const setCookie = await session.commit();

  // Create the data object
  const data: LoaderData = {
    ...criticalData,
    ...deferredData,
    erpData,
  };

  // Return Response with proper headers
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': setCookie,
    },
  });
}

async function loadCriticalData({context}: LoaderFunctionArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    context.storefront.query(HERO_BANNER_QUERY),
  ]);

  return {
    featuredCollections: collections.nodes,
  };
}

function loadDeferredData({context}: LoaderFunctionArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  const heroBannerHandle = 'herobanner-fesbparf';
  const heroBanner = context.storefront
    .query(HERO_BANNER_QUERY_BY_HANDLE, {
      variables: {
        handle: heroBannerHandle,
      } as GetHeroBannerByHandleQueryVariables,
    })
    .catch((error) => {
      console.error('HeroBanner error:', error);
      return null;
    });

  const luxuryShineHandle = 'where-luxury-shines';
  const luxuryshinecollections = context.storefront
    .query(LUXURY_SHINE_QUERY_BY_HANDLE, {
      variables: {
        handle: luxuryShineHandle,
      } as GetLuxuryshineContentByHandleQueryVariables,
    })
    .catch((error) => {
      console.error('Luxuryshine collections error:', error);
      return null;
    });

  const justlanded = context.storefront
    .query(JUST_LANDED_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  const eventready = context.storefront
    .query(EVENT_READY_QUERY)
    .catch((error) => {
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
    heroBanner,
    luxuryshinecollections,
    justlanded,
    eventready,
  };
}

export default function Homepage() {
  const data = useLoaderData<LoaderData>();

  return (
    <div className="home">
      <HeroBannerSection heroBanner={data.heroBanner} />
      <JustLandedSection products={data.justlanded} />
      <FeaturedCollections collections={data.featuredCollections} />
      <EventReady products={data.eventready} />
      <LuxuryShineCollections
        luxuryshinecollections={data.luxuryshinecollections}
      />
    </div>
  );
}

function HeroBannerSection({
  heroBanner,
}: {
  heroBanner: Promise<GetHeroBannerByHandleQuery | null>;
}) {
  return (
    <div className="HeroBanner">
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={heroBanner}>
          {(response) => {
            const collection = response?.metaobject;

            return (
              <div className="">
                {collection ? (
                  <HeroBanner key={collection.id} heroBanner={collection} />
                ) : (
                  <div>No hero banner found.</div>
                )}
              </div>
            );
          }}
        </Await>
      </Suspense>
    </div>
  );
}

function LuxuryShineCollections({
  luxuryshinecollections,
}: {
  luxuryshinecollections: Promise<GetLuxuryshineContentByHandleQuery | null>;
}) {
  return (
    <div className="luxuryshine-collections">
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={luxuryshinecollections}>
          {(response) => {
            const collection = response?.metaobject;

            return (
              <div className="">
                {collection ? (
                  <LuxuryShine
                    key={collection.id}
                    luxuryshinecollection={collection}
                  />
                ) : (
                  <div>No luxury shine collection found.</div>
                )}
              </div>
            );
          }}
        </Await>
      </Suspense>
    </div>
  );
}

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <div className="recommended-products">
      <h2>Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  );
}

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;

const LUXURY_SHINE_QUERY = `#graphql
  query GetLuxuryshineContent {
    metaobjects(type: "luxuryshine", first: 1) {
      nodes {
        id
        handle
        luxuryshineTitle: field(key: "luxuryshinetitle") {
          value
        }
        luxuryshineContent: field(key: "luxuryshinecontent") {
          value
        }
        luxuryshineProducts: field(key: "luxuryshineproducts") {
          value
        }
        luxuryshineDiscoverLink: field(key: "luxuryshinediscoverlink") {
          value
        }
        luxuryshineCollectionText1: field(key: "luxuryshinecollectiontext1") {
          value
        }
        luxuryshineCollectionImage1: field(key: "luxuryshinecollectionimage1") {
          reference {
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
        }
        luxuryshineCollectionLink1: field(key: "luxuryshinecollectionlink1") {
          value
        }
        luxuryshineCollectionText2: field(key: "luxuryshinecollectiontext2") {
          value 
        }
        luxuryshineCollectionImage2: field(key: "luxuryshinecollectionimage2") {
          reference {
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
        }
        luxuryshineCollectionLink2: field(key: "luxuryshinecollectiontlink2") {
          value
        }
      }
    }
  }
` as const;

const JUST_LANDED_QUERY = `#graphql
  fragment JustLanded on Product {
    id
    title
    description
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }

  query JustLanded($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 3, reverse: true) {
      nodes {
        ...JustLanded
      }
    }
  }
` as const;

const EVENT_READY_QUERY = `#graphql
  fragment EventReady on Product {
    id
    title
    description
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
 
  query EventReady($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: CREATED_AT, reverse: false) {
      nodes {
        ...EventReady
      }
    }
  }
` as const;
