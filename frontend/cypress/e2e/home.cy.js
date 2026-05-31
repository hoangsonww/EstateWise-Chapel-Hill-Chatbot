/// <reference types="cypress" />

describe("EstateWise landing page", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("opens chat via “Explore Properties” button", () => {
    cy.contains("a", "Explore Properties").click();
    cy.url().should("include", "/chat");
  });
});
