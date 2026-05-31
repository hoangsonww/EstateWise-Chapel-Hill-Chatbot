const { createDriver } = require("./driver.js");
const { By, until } = require("selenium-webdriver");

let expect;
before(async () => {
  ({ expect } = await import("chai"));
});

describe("Home page", function () {
  this.timeout(30000);
  let driver;
  const base = "https://estatewise.vercel.app";

  before(async () => {
    driver = await createDriver();
    await driver.manage().setTimeouts({ implicit: 5000 });
  });

  after(async () => {
    await driver.quit();
  });

  it("shows hero and “Learn More” scrolls to #features", async () => {
    await driver.get(base);
    await driver.findElement(By.css("h1"));
    await driver.findElement(By.css('[aria-label="Learn More"]')).click();
    await driver.wait(until.urlContains("#features"));
    expect(new URL(await driver.getCurrentUrl()).hash).to.equal("#features");
  });

  it("“Explore Properties” opens /chat", async () => {
    await driver.get(base);
    await driver.findElement(By.linkText("Explore Properties")).click();
    await driver.wait(until.urlContains("/chat"));
    expect(await driver.getCurrentUrl()).to.include("/chat");
  });
});
