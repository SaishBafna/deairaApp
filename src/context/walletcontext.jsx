import React, { createContext, useState, useEffect, useContext } from "react";
import { ethers } from "ethers";
import axios from "axios";

export const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // USDT Contract Address (BSC Testnet)
  const USDTContractAddress = "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd"; // Your testnet USDT contract

  // Minimal ABI for ERC20 token operations
  const minimalABI = [
    {
      "inputs": [
        { "internalType": "address", "name": "account", "type": "address" }
      ],
      "name": "balanceOf",
      "outputs": [
        { "internalType": "uint256", "name": "", "type": "uint256" }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        { "internalType": "address", "name": "to", "type": "address" },
        { "internalType": "uint256", "name": "value", "type": "uint256" }
      ],
      "name": "transfer",
      "outputs": [
        { "internalType": "bool", "name": "", "type": "bool" }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "decimals",
      "outputs": [
        { "internalType": "uint8", "name": "", "type": "uint8" }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];

  // Helper function to encrypt wallet address using base64
  const encryptWalletAddress = (address) => {
    return btoa(address);
  };

  // Load wallet address from localStorage on component mount
  useEffect(() => {
    const savedAddress = localStorage.getItem("walletAddress");
    if (savedAddress) {
      setWalletAddress(savedAddress);
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum !== "undefined") {
      if (isConnecting) {
        alert("Connection request already in progress.");
        return null;
      }

      try {
        setIsConnecting(true);

        // Trigger MetaMask popup
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (accounts.length > 0) {
          const address = accounts[0];
          setWalletAddress(address);
          localStorage.setItem("walletAddress", address);
          const encryptedWalletAddress = encryptWalletAddress(address);
          localStorage.setItem("encryptedWalletAddress", encryptedWalletAddress);
          
          // Auto-switch to BSC Testnet after connecting
          await switchToBSCTestnet();
          alert("Wallet connected successfully to BSC Testnet!");
          return address;
        }
        return null;
      } catch (error) {
        console.error(error);
        if (error.code === -32002) {
          alert("Connection request is already in progress. Please wait.");
        } else {
          alert("Error connecting to wallet.");
        }
        return null;
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("BSC Network Wallet dApp not found!");
      return null;
    }
  };

  // Function to switch to BSC Testnet
  const switchToBSCTestnet = async () => {
    try {
      // Try to switch to BSC Testnet
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x61' }], // BSC Testnet chain ID
      });
    } catch (switchError) {
      // If BSC Testnet is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x61',
              chainName: 'BSC Testnet',
              nativeCurrency: {
                name: 'tBNB',
                symbol: 'tBNB',
                decimals: 18
              },
              rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
              blockExplorerUrls: ['https://testnet.bscscan.com/']
            }]
          });
        } catch (addError) {
          console.error('Failed to add BSC Testnet:', addError);
          alert('Failed to add BSC Testnet to wallet');
        }
      } else {
        console.error('Failed to switch to BSC Testnet:', switchError);
        alert('Failed to switch to BSC Testnet');
      }
    }
  };

  const disconnectWallet = async () => {
    try {
      setWalletAddress('');
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('encryptedWalletAddress');

      if (typeof window.ethereum !== 'undefined') {
        try {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{
              eth_accounts: {}
            }]
          });
        } catch (revokeError) {
          console.log('Permissions revoke not supported, using alternative disconnect method');
        }

        if (window.ethereum._state) {
          window.ethereum._state.accounts = null;
        }
      }

      console.log('Wallet disconnected completely');
    } catch (error) {
      console.log('Error during disconnect:', error);
      setWalletAddress('');
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('encryptedWalletAddress');
    }
  };

  // Fixed getUSDTBalance function for ethers.js v6
  const getUSDTBalance = async (userAddress = null) => {
    try {
      // For ethers.js v6, use BrowserProvider instead of Web3Provider
      const provider = new ethers.BrowserProvider(window.ethereum);
      const address = userAddress || walletAddress;

      if (!address) {
        throw new Error("No wallet address available");
      }

      const usdtContract = new ethers.Contract(USDTContractAddress, minimalABI, provider);
      const balance = await usdtContract.balanceOf(address);

      // USDT on BSC has 18 decimals (hardcoded to avoid decimals() call issues)
      const decimals = 18;

      // Fix for ethers.js v6 - use ethers.formatUnits instead of ethers.utils.formatUnits
      const formattedBalance = ethers.formatUnits(balance, decimals);

      return formattedBalance;
    } catch (error) {
      console.error("Error getting USDT balance:", error);
      return "0";
    }
  };

  // Fixed Transfer USDT function for ethers.js v6 with BSC Testnet
  const transferUSDT = async (receiverAddress, amount) => {
    if (!window.ethereum) {
      alert('BSC Network Wallet dApp not found!');
      return { success: false, txHash: null };
    }

    if (!walletAddress) {
      alert('Please connect your wallet first!');
      return { success: false, txHash: null };
    }

    if (!receiverAddress || !ethers.isAddress(receiverAddress)) {
      alert('Please enter a valid receiver address!');
      return { success: false, txHash: null };
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount!');
      return { success: false, txHash: null };
    }

    try {
      // Check network first - ensure we're on BSC Testnet
      const networkOk = await checkNetwork();
      if (!networkOk) {
        return { success: false, txHash: null };
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Set up USDT contract instance
      const usdtContract = new ethers.Contract(USDTContractAddress, minimalABI, signer);

      const decimals = 18;
      const amountInWei = ethers.parseUnits(amount.toString(), decimals);

      // Check balance before transfer
      const balance = await usdtContract.balanceOf(walletAddress);
      if (balance < amountInWei) {
        alert('Insufficient USDT balance!');
        return { success: false, txHash: null };
      }

      // Execute the transfer
      const transferTx = await usdtContract.transfer(receiverAddress, amountInWei);
      alert(`Transaction submitted on BSC Testnet! Hash: ${transferTx.hash}`);

      // Wait for transaction confirmation
      const receipt = await transferTx.wait();

      if (receipt.status === 1) {
        console.log("Transfer successful!");
        console.log(`Transfer successful! View on BSC Testnet Explorer: https://testnet.bscscan.com/tx/${transferTx.hash}`);
        return { success: true, txHash: transferTx.hash };
      } else {
        console.log("Transfer failed!");
        alert("USDT transfer failed!");
        return { success: false, txHash: transferTx.hash };
      }

    } catch (error) {
      console.error('USDT Transfer Error:', error);

      if (error.code === 'ACTION_REJECTED') {
        alert('Transaction rejected by user');
      } else if (error.code === -32603) {
        alert('Internal JSON-RPC error. Please try again.');
      } else if (error.message.includes('insufficient funds')) {
        alert('Insufficient funds for gas fee (need tBNB for testnet)');
      } else if (error.message.includes('User denied')) {
        alert('Transaction cancelled by user');
      } else if (error.message.includes('could not decode result data')) {
        alert('Contract interaction failed. Please check if you are on BSC Testnet.');
      } else {
        alert(`Transfer failed: ${error.message || 'Unknown error'}`);
      }

      return { success: false, txHash: null };
    }
  };

  // Updated network check for BSC Testnet only
  const checkNetwork = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const BSC_TESTNET_CHAIN_ID = 97n; // BSC Testnet chain ID
      
      if (network.chainId !== BSC_TESTNET_CHAIN_ID) {
        const switchResult = await switchToBSCTestnet();
        // Recheck after switching
        const newNetwork = await provider.getNetwork();
        if (newNetwork.chainId !== BSC_TESTNET_CHAIN_ID) {
          alert('Please switch to BSC Testnet manually');
          return false;
        }
      }
      
      console.log('Connected to BSC Testnet');
      return true;
    } catch (error) {
      console.error('Network check error:', error);
      alert('Please switch to BSC Testnet');
      return false;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connectWallet,
        disconnectWallet,
        isConnecting,
        transferUSDT,
        getUSDTBalance,
        checkNetwork,
        switchToBSCTestnet
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};