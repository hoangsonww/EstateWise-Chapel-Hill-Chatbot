const { createDriver } = require("./driver.js");
const { By, Key, until } = require("selenium-webdriver");

let expect;
before(async () => {
  ({ expect } = await import("chai"));
});

describe("Auth forms (client-side)", function () {
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

  it("blocks signup when passwords mismatch", async () => {
    await driver.get(`${base}/signup`);
    await driver
      .findElement(By.css('input[placeholder="Username"]'))
      .sendKeys("User");
    await driver.findElement(By.css('input[type="email"]')).sendKeys("u@x.com");
    await driver
      .findElement(By.css('input[type="password"]'))
      .sendKeys("abc123");
    await driver
      .findElement(By.css('input[placeholder="Confirm Password"]'))
      .sendKeys("xyz789", Key.ENTER);

    const err = await driver.wait(
      until.elementLocated(
        By.xpath("//*[contains(text(),'Passwords do not match')]"),
      ),
      5000,
    );
    expect(err).to.exist;
  });

  it("login with invalid creds shows toast", async () => {
    await driver.get(`${base}/login`);
    await driver.findElement(By.css('input[type="email"]')).sendKeys("wrong@x");
    await driver
      .findElement(By.css('input[type="password"]'))
      .sendKeys("bad", Key.ENTER);

    const toast = await driver.wait(
      until.elementLocated(By.css("[data-sonner-toast]")),
      8000,
    );
    expect(await toast.getText()).to.match(/invalid|failed|error/i);
  });
});
