import { HomePage } from "@/components/HomePage";
import { ThemeProviders } from "@/components/providers";

async function getMessages(locale: string) {
  try {
    return (await import(`@/i18n/${locale}.json`)).default;
  } catch (error) {
    return (await import(`@/i18n/en.json`)).default;
  }
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const langParam = params.lang;
  const regionParam = params.region;

  const lang = typeof langParam === 'string' ? langParam : 'en';
  // Determine region: explicit param > implied by lang > default 'us'
  // If lang is one of the EU languages, default region to EU.
  let region = typeof regionParam === 'string' ? regionParam : undefined;
  
  if (!region) {
    if (['de', 'fr', 'es', 'it'].includes(lang)) {
      region = 'eu';
    } else {
      region = 'us';
    }
  }

  const messages = await getMessages(lang);

  return (
    <ThemeProviders messages={messages} locale={lang}>
      <HomePage region={region} />
    </ThemeProviders>
  );
}
