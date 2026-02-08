import { generateStaticParamsFor, importPage } from 'nextra/pages';
import { useMDXComponents } from '@/mdx-components';

export const generateStaticParams = generateStaticParamsFor('mdxPath');

export async function generateMetadata(props: {
  params: Promise<{ mdxPath?: string[] }>;
}) {
  const params = await props.params;
  const { metadata } = await importPage(params.mdxPath);
  return metadata;
}

// useMDXComponents is not a React hook, just named like one per Nextra convention
// eslint-disable-next-line react-hooks/rules-of-hooks
const mdxComponents = useMDXComponents();

export default async function Page(props: {
  params: Promise<{ mdxPath?: string[] }>;
}) {
  const params = await props.params;
  const result = await importPage(params.mdxPath);
  const { default: MDXContent, toc, metadata, ...rest } = result;
  
  const Wrapper = mdxComponents.wrapper!;
  
  return (
    <Wrapper toc={toc} metadata={metadata} {...rest}>
      <MDXContent {...props} params={params} />
    </Wrapper>
  );
}
