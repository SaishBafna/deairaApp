import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import ActivationPackage from "./ActivationPackage";

// Mock useNavigate from react-router-dom
jest.mock("react-router-dom", () => {
  const original = jest.requireActual("react-router-dom");
  return {
    ...original,
    useNavigate: jest.fn()
  };
});

describe("ActivationPackage Component", () => {
  let navigateMock;
  let alertMock;

  beforeEach(() => {
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);

    alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ActivationPackage />
      </MemoryRouter>
    );
  };

  test("renders page title and wallet balance", () => {
    renderComponent();

    expect(screen.getByText("Activation Packages")).toBeInTheDocument();
    expect(screen.getByText("Available Balance")).toBeInTheDocument();
    expect(screen.getByText("185.50 USDT")).toBeInTheDocument();
  });

  test("shows select dropdown with package options", () => {
    renderComponent();

    const select = screen.getByLabelText("Select Package");
    expect(select).toBeInTheDocument();

    expect(screen.getByText(/Basic Package/)).toBeInTheDocument();
    expect(screen.getByText(/Advanced Package/)).toBeInTheDocument();
    expect(screen.getByText(/Professional Package/)).toBeInTheDocument();
  });

  test("updates selected package and shows details", () => {
    renderComponent();

    const select = screen.getByLabelText("Select Package");

    fireEvent.change(select, { target: { value: "basic" } });

    expect(screen.getByText("Basic Package - 50 USDT")).toBeInTheDocument();
    expect(screen.getByText("Basic trading signals")).toBeInTheDocument();
  });

  test("checkbox toggles terms agreement", () => {
    renderComponent();

    const checkbox = screen.getByRole("checkbox");

    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  test("purchase button disabled until package and terms are satisfied", () => {
    renderComponent();

    const select = screen.getByLabelText("Select Package");
    const checkbox = screen.getByRole("checkbox");
    const button = screen.getByRole("button");

    // Initially disabled
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Select a Package");

    // Select package
    fireEvent.change(select, { target: { value: "basic" } });
    expect(button).toHaveTextContent("Agree to Terms");
    expect(button).toBeDisabled();

    // Agree to terms
    fireEvent.click(checkbox);
    expect(button).toHaveTextContent("Purchase for 50 USDT");
    expect(button).toBeEnabled();
  });

  test("shows insufficient balance if package price is higher than balance", () => {
    renderComponent();

    const select = screen.getByLabelText("Select Package");
    const checkbox = screen.getByRole("checkbox");

    fireEvent.change(select, { target: { value: "professional" } }); // Needs 300 USDT
    fireEvent.click(checkbox);

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Insufficient Balance");
    expect(button).toBeDisabled();
  });

  test("submits form and triggers purchase alert", () => {
    renderComponent();

    const select = screen.getByLabelText("Select Package");
    const checkbox = screen.getByRole("checkbox");

    fireEvent.change(select, { target: { value: "basic" } });
    fireEvent.click(checkbox);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(alertMock).toHaveBeenCalledWith("Purchasing Basic Package for 50 USDT");
  });

  test("back button triggers navigation", () => {
    renderComponent();

    const backButton = screen.getByText("Back").closest("button");
    fireEvent.click(backButton);

    expect(navigateMock).toHaveBeenCalledWith(-1);
  });

  test("Deposit Funds button navigates correctly", () => {
    renderComponent();

    const depositButton = screen.getByText("Deposit Funds");
    fireEvent.click(depositButton);

    expect(navigateMock).toHaveBeenCalledWith("/deposit");
  });
});
