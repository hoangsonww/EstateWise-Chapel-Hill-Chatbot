/// <reference types="cypress" />

describe("EstateWise landing page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("displays the hero section and scrolls to Features when “Learn More” clicked", () => {
    cy.contains("h1", "EstateWise").should("be.visible");

    cy.get('[aria-label="Learn More"]').click();
    cy.location("hash").should("eq", "#features");

    // first feature card appears in viewport
    cy.get("#features").find(".slick-slide").first().should("be.visible");
  });

  it("opens chat via “Explore Properties” button", () => {
    cy.contains("a", "Explore Properties").click();
    cy.url().should("include", "/chat");
  });

  it("slider navigation arrows cycle through items", () => {
    // go to Testimonials section
    cy.get('#testimonials').scrollIntoView();

    // wait for slick to initialise
    cy.get("#testimonials .slick-slider").should("exist");

    // click next arrow and assert slide changed (dot indicator)
    cy.get('#testimonials button[aria-label="Next"]').click();
    cy.get("#testimonials .slick-dots li.slick-active").should(
      "have.length",
      1,
    );
  });

  it("FAQ accordion shows answers when scrolled into view", () => {
    cy.get("#faqs").scrollIntoView();
    // first question/answer pair becomes visible
    cy.contains("#faqs h3", "Do I need an account?").should("be.visible");
    cy.contains("#faqs p", "You can chat as a guest").should("be.visible");
  });
});
