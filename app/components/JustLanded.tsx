import {Suspense} from 'react';
import {Await, Link} from '@remix-run/react';
import {Image, Money} from '@shopify/hydrogen';
import type {JustLandedQuery} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export default function JustLandedSection({
  products,
}: {
  products: Promise<JustLandedQuery | null>;
}) {
  return (
    <main className="py-[41px] bg-white h-auto">
      <div className="max-w-[1170px] mx-auto px-[15px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="!text-[35px] !leading-[43px] !font-medium !tracking-[1px] !text-[#87857E] !font-[Big Caslon] !not-italic !normal-case !text-left">
            Just Landed
          </h2>
          <Link to="/collections/all">
            <span className="text-[20px] leading-[24px] tracking-[2px] text-[#87857E] uppercase font-mr-eaves hover:underline">
              Shop New Arrivals
            </span>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="product-item flex flex-wrap text-center -mx-[5px] lg:-mx-[11px]">
          <Suspense fallback={<div>Loading...</div>}>
            <Await resolve={products}>
              {(response) =>
                response?.products?.nodes.map((product, idx) => {
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const variantUrl = useVariantUrl(
                    product.handle,
                    product.variants?.nodes?.[0]?.selectedOptions,
                  );
                  const image = product.featuredImage;

                  return (
                    <div
                      key={product.id}
                      className={`w-1/2 md:w-1/3 px-[5px] lg:px-[11px] mb-[38px] lg:mb-[47px] ${
                        idx > 2 ? 'hidden md:block' : ''
                      }`}
                    >
                      <Link
                        to={variantUrl}
                        prefetch="intent"
                        className="group  overflow-auto shadow-lg flex flex-col hover:shadow-2xl hover:scale-105  !no-underline "
                      >
                        {image && (
                          <Image
                            alt={image.altText || product.title}
                            aspectRatio="1/1"
                            data={image}
                            className="transition-transform duration-[350ms] ease-[cubic-bezier(0.3,0.86,0.36,0.95)] !h-[450px] w-full object-cover group-hover:opacity-90"
                            loading="lazy"
                          />
                        )}
                        <div className="p-4 flex flex-col flex-1">
                          <h2 className="text-lg !font-semibold !mb-[0.25rem] !line-clamp-2">
                            {product.title}
                          </h2>
                          <p className="!text-700 !text-sm !mb-[0.25rem]">
                            <Money data={product.priceRange.minVariantPrice} />
                          </p>
                          {'description' in product && product.description && (
                            <p className="text-600 text-[0.75rem] leading-[1rem] mb-2 line-clamp-3">
                              {product.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    </div>
                  );
                })
              }
            </Await>
          </Suspense>
        </div>
      </div>
    </main>
  );
}
