import {Suspense} from 'react';
import {Await, Link} from '@remix-run/react';
import {Image, Money} from '@shopify/hydrogen';
import type {EventReadyQuery} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

export default function EventReady({
  products,
}: {
  products: Promise<EventReadyQuery | null>;
}) {
  // Custom redirect paths for each product
  const customRedirectPaths = [
    '/ppc/page-2',
    '/ppc/page-3',
    '/ppc/page-1',
    '/ppc/page-1',
  ];

  return (
    <section className="py-[41px] bg-white">
      <div className="max-w-[1170px] mx-auto px-[15px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="!text-[35px] !leading-[43px] !font-medium !tracking-[1px] !text-[#87857E] !font-[Big Caslon] !not-italic !normal-case !text-left">
            Event-Ready Essentials
          </h2>
          <Link
            to="/collections/all"
            className="text-[20px] leading-[24px] tracking-[2px] text-[#87857E] uppercase font-mr-eaves hover:underline"
          >
            Shop All
          </Link>
        </div>

        {/* Products Grid */}
        <div className="flex flex-wrap -mx-[5px]">
          <Suspense fallback={<div>Loading...</div>}>
            <Await resolve={products}>
              {(response) =>
                response?.products?.nodes.map((product, index) => {
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const variantUrl = useVariantUrl(product.handle);
                  const image = product.featuredImage;
                  const redirectTo = customRedirectPaths[index] || variantUrl;

                  return (
                    <div
                      key={product.id}
                      className="w-1/4 px-[5px] mb-[38px] group text-center flex flex-col"
                    >
                      <Link
                        to={redirectTo}
                        prefetch="intent"
                        className="group overflow-hidden shadow-lg flex flex-col hover:shadow-2xl hover:scale-105 !no-underline"
                      >
                        {image && (
                          <Image
                            alt={image.altText || product.title}
                            aspectRatio="1/1"
                            data={image}
                            className="transition-transform duration-[350ms] ease-[cubic-bezier(0.3,0.86,0.36,0.95)] !h-[500px] w-full object-cover group-hover:opacity-90"
                            loading="lazy"
                          />
                        )}
                      </Link>

                      <div className="flex flex-col flex-1">
                        <h2 className="text-center font-bold leading-[26px] tracking-[0.32px] text-[#2B2A2A] font-[Mr Eaves XL Mod OT] text-[20px] mt-2 !mb-0">
                          {product.title}
                        </h2>
                        <ul className="text-center font-normal leading-[26px] tracking-[0.32px] text-[#2B2A2A] font-[Mr Eaves XL Mod OT] text-[16px] mt-1">
                          {product.description && (
                            <li className="text-center font-normal leading-[26px] tracking-[0.32px] text-[#2B2A2A] font-[Mr Eaves XL Mod OT] text-[16px] !mb-0">
                              {product.description}
                            </li>
                          )}
                          <li>
                            <Money data={product.priceRange.minVariantPrice} />
                          </li>
                        </ul>
                      </div>
                    </div>
                  );
                })
              }
            </Await>
          </Suspense>
        </div>
      </div>
    </section>
  );
}
