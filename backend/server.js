const puppeteer = require("puppeteer");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: ["https://web-scraping-reviews-page.vercel.app/"],
    methods: ["POST", "GET"],
    credentials: true,
  })
);
app.use(bodyParser.json());

app.post("/scrape-reviews", async (req, res) => {
  const { url, totalReviews } = req.body;

  console.log(`Scraping URL: ${url} for ${totalReviews} reviews`);

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    let allReviews = [];
    let currentPage = 1;
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    await page.goto(url, { waitUntil: "networkidle2" });

    while (allReviews.length < totalReviews) {
      console.log(`Scraping page ${currentPage}...`);

      const reviews = await page.evaluate(() => {
        let reviewArray = [];
        let reviewElements = document.querySelectorAll(".review");

        reviewElements.forEach((reviewElement) => {
          let title =
            reviewElement.querySelector(".review-title")?.innerText || null;
          let rating =
            reviewElement.querySelector(".review-rating")?.innerText || null;
          let text =
            reviewElement.querySelector(".review-text")?.innerText || null;
          let date =
            reviewElement.querySelector(".review-date")?.innerText || null;
          let author =
            reviewElement.querySelector(".review-author")?.innerText || null;

          reviewArray.push({ title, rating, text, date, author });
        });

        return reviewArray;
      });

      allReviews = allReviews.concat(reviews);

      const nextButton = await page.$("li.a-last a");
      if (!nextButton || allReviews.length >= totalReviews) {
        break;
      }

      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2" }),
        nextButton.click(),
      ]);

      await delay(2000);
      currentPage++;
    }

    await browser.close();
    console.log(`Scraped ${allReviews.length} reviews.`);
    res.json(allReviews.slice(0, totalReviews));
  } catch (error) {
    console.error("Error occurred while scraping:", error);
    res.status(500).json({ error: "Failed to scrape reviews." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
