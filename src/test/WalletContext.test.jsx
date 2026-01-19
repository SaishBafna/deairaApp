import React from "react";
import { renderHook, act } from "@testing-library/react";
import { WalletProvider, WalletContext } from "./WalletContext";
import { ethers } from "ethers";

// ---- MOCKS ----

// Mock window.ethereum
const mockEthereum = {
  request: jest.fn()
};

// Mock ethers v6
jest.mock("ethers", () => {
  const actual = jest.requireActual("ethers");
  return {
    ...actual,
    BrowserProvider: jest.fn(() => ({
      getSigner: jest.fn().mockResolvedValue("mockSigner"),
      getNetwork: jest.fn().mockResolvedValue({ chainId: 97n })
    })),
    Contract: jest.fn(() => ({
      balanceOf: jest.fn().mockResolvedValue("1000000000000000000"), // 1 token
      transfer: jest.fn().mockResolvedValue({
        hash: "0xtxhash",
        wait: jest.fn().mockResolvedValue({ status: 1 })
      })
    })),
    formatUnits: jest.fn(() => "1.0"),
    parseUnits: jest.fn(() => "1000000000000000000"),
    isAddress: jest.fn(() => true)
  };
});

describe("WalletContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    window.ethereum = mockEthereum;
  });

  const setup = () => {
    return renderHook(() => React.useContext(WalletContext), {
      wrapper: WalletProvider,
    });
  };

  test("initial values are correct", () => {
    const { result } = setup();
    expect(result.current.walletAddress).toBe("");
    expect(result.current.isConnecting).toBe(false);
    expect(typeof result.current.connectWallet).toBe("function");
    expect(typeof result.current.disconnectWallet).toBe("function");
  });

  test("connectWallet stores wallet address & encrypted version", async () => {
    mockEthereum.request.mockResolvedValueOnce(["0xABC"]);

    const { result } = setup();

    await act(async () => {
      await result.current.connectWallet();
    });

    expect(localStorage.getItem("walletAddress")).toBe("0xABC");
    expect(localStorage.getItem("encryptedWalletAddress")).toBe(btoa("0xABC"));
  });

  test("disconnectWallet clears wallet address & storage", async () => {
    localStorage.setItem("walletAddress", "0xABC");
    localStorage.setItem("encryptedWalletAddress", "encrypted");

    const { result } = setup();

    await act(async () => {
      await result.current.disconnectWallet();
    });

    expect(localStorage.getItem("walletAddress")).toBe(null);
    expect(localStorage.getItem("encryptedWalletAddress")).toBe(null);
    expect(result.current.walletAddress).toBe("");
  });

  test("getUSDTBalance returns formatted balance", async () => {
    const { result } = setup();

    // Simulate wallet connected
    await act(async () => {
      result.current.walletAddress = "0xABC";
    });

    let balance;
    await act(async () => {
      balance = await result.current.getUSDTBalance();
    });

    expect(balance).toBe("1.0");
  });

  test("getUSDTBalance returns 0 if error", async () => {
    ethers.Contract.mockImplementationOnce(() => {
      throw new Error("Mock Error");
    });

    const { result } = setup();

    await act(async () => {
      result.current.walletAddress = "0xABC";
    });

    let balance;
    await act(async () => {
      balance = await result.current.getUSDTBalance();
    });

    expect(balance).toBe("0");
  });

  test("transferUSDT validates missing wallet", async () => {
    const { result } = setup();
    window.alert = jest.fn();

    let response;
    await act(async () => {
      response = await result.current.transferUSDT("0xDEF", "10");
    });

    expect(response.success).toBe(false);
  });

  test("transferUSDT executes transfer when valid", async () => {
    const { result } = setup();
    window.alert = jest.fn();

    // Set wallet first
    await act(async () => {
      result.current.walletAddress = "0xABC";
    });

    let response;
    await act(async () => {
      response = await result.current.transferUSDT("0xDEF", "1");
    });

    expect(response.success).toBe(true);
    expect(response.txHash).toBe("0xtxhash");
  });

});
