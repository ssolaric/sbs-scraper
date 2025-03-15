import * as cheerio from "cheerio";

async function requestExchangeRates(date: string) {
  const template = await Bun.file("request-body.txt").text();
  const requestBody = template.replaceAll("\n", "").replaceAll("${date}", date);
  const response = await fetch(
    "https://www.sbs.gob.pe/app/pp/SISTIP_PORTAL/Paginas/Publicacion/TipoCambioContable.aspx",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64; rv:102.0) Gecko/20100101 Firefox/102.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "X-Requested-With": "XMLHttpRequest",
        "X-MicrosoftAjax": "Delta=true",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Pragma: "no-cache",
      },
      referrer:
        "https://www.sbs.gob.pe/app/pp/SISTIP_PORTAL/Paginas/Publicacion/TipoCambioContable.aspx",
      body: requestBody,
      method: "POST",
    }
  );
  const text = await response.text();
  return text;
}

function parseResponse(responseText: string) {
  const ind1 = responseText.indexOf(`<table class="rgMasterTable"`);
  const ind2 = responseText.indexOf(`</table>`, ind1);
  const html = responseText.slice(ind1, ind2 + 8);
  const $ = cheerio.load(html);
  const usd = $("thead").children().first().children();
  if ($(usd[0]).text() === "") {
    return [];
  }
  const currencies = [
    {
      region: $(usd[0]).text(),
      name: $(usd[1]).text(),
      rate: parseFloat($(usd[2]).text()),
    },
  ];
  const tbody = $("tbody").children();
  for (const currency of tbody.toArray()) {
    const parts = $(currency).children();
    currencies.push({
      region: $(parts[0]).text(),
      name: $(parts[1]).text(),
      rate: parseFloat($(parts[2]).text()),
    });
  }
  return currencies;
}

async function main() {
  const argv = process.argv.slice(2);
  let date;
  if (argv.length === 0) {
    date = new Date().toLocaleDateString("fr-CA");
  } else {
    date = argv[0];
  }
  if (!date.match(/\d{4}-\d{2}-\d{2}/)) {
    console.error("A date in the format YYYY-MM-DD must be provided.");
    process.exit(1);
  }
  const responseText = await requestExchangeRates(date);
  const currencies = parseResponse(responseText);
  console.error(currencies);
  if (currencies.length === 0) {
    console.log("Exchange rate was not available on this date.");
  } else {
    console.log(JSON.stringify(currencies));
  }
}

main();
