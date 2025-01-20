import { useState } from 'react'
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing"
import { ethers } from 'ethers'
import { fromBech32, fromHex, toBech32, toHex } from "@cosmjs/encoding";
import { Secp256k1 } from "@cosmjs/crypto";
import { toBase64, toUtf8 } from "@cosmjs/encoding";
import { sha256 } from "@cosmjs/crypto";

import './App.css'

function App() {
  const defaultConfigs = {
    "60": {
      chainId: "allingaming_local-1",
      chainName: "Allingaming EVM Testnet",
      prefix: "allin",
      tokenName: "ALLIN",
      tokenDenom: "aallin",
      placeholder: "e.g., allingaming_local-1"
    },
    "118": {
      chainId: "allingaming-1",
      chainName: "Allingaming Cosmos Testnet",
      prefix: "allin",
      tokenName: "ALLIN",
      tokenDenom: "aallin",
      placeholder: "e.g., allingaming-1"
    }
  };

  const [chainConfig, setChainConfig] = useState({
    chainId: defaultConfigs["60"].chainId,
    chainName: defaultConfigs["60"].chainName,
    prefix: defaultConfigs["60"].prefix,
    coinType: "60", // Default to EVM
    tokenName: defaultConfigs["60"].tokenName,
    tokenDenom: defaultConfigs["60"].tokenDenom,
    rpc: "https://rpc-endpoint.example",
    rest: "https://rest-endpoint.example"
  });

  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showCoinTypeWarning, setShowCoinTypeWarning] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [isPrivateKeyMode, setIsPrivateKeyMode] = useState(false);

  const handleCoinTypeChange = (e) => {
    const newCoinType = e.target.value;
    setChainConfig({
      ...chainConfig,
      coinType: newCoinType,
      chainId: defaultConfigs[newCoinType].chainId,
      chainName: defaultConfigs[newCoinType].chainName,
      prefix: defaultConfigs[newCoinType].prefix,
      tokenName: defaultConfigs[newCoinType].tokenName,
      tokenDenom: defaultConfigs[newCoinType].tokenDenom,
    });
    setShowCoinTypeWarning(true);
    setTimeout(() => setShowCoinTypeWarning(false), 10000);
  };

  const handleKeplrSign = async () => {
    if (!message) {
      setError("Please enter a message to sign");
      return;
    }
    if (!window.keplr) {
      setError("Please install Keplr extension");
      return;
    }

    try {
      // Clear previous states
      setError("");
      setResult(null);

      const defaultChainConfig = {
        chainId: chainConfig.chainId,
        chainName: chainConfig.chainName,
        rpc: chainConfig.rpc,
        rest: chainConfig.rest,
        bip44: {
          coinType: parseInt(chainConfig.coinType)
        },
        bech32Config: {
          bech32PrefixAccAddr: chainConfig.prefix,
          bech32PrefixAccPub: `${chainConfig.prefix}pub`,
          bech32PrefixValAddr: `${chainConfig.prefix}valoper`,
          bech32PrefixValPub: `${chainConfig.prefix}valoperpub`,
          bech32PrefixConsAddr: `${chainConfig.prefix}valcons`,
          bech32PrefixConsPub: `${chainConfig.prefix}valconspub`
        },
        currencies: [{
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        }],
        feeCurrencies: [{
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        }],
        stakeCurrency: {
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        },
        beta: true
      };

      // Suggest chain configuration for both EVM and Cosmos chains
      if (chainConfig.coinType === "60") {
        await window.keplr.experimentalSuggestChain(defaultChainConfig);
      } else {
        await window.keplr.experimentalSuggestChain({
          ...defaultChainConfig,
          features: ["ibc-transfer", "ibc-go"]
        });
      }

      await window.keplr.enable(chainConfig.chainId);
      const offlineSigner = window.keplr.getOfflineSigner(chainConfig.chainId);
      const [account] = await offlineSigner.getAccounts();

      let signedData;
      if (chainConfig.coinType === "60") {
        // EVM signing
        signedData = await window.keplr.signEthereum(
          chainConfig.chainId,
          account.address,
          message,
          "message"
        );
        const signatureHex = '0x' + Array.from(signedData, byte => byte.toString(16).padStart(2, '0')).join('');

        setResult({
          wallet: "Keplr",
          address: account.address,
          ethAddress: (await window.keplr.getKey(chainConfig.chainId)).ethereumHexAddress,
          pubKey: Buffer.from(account.pubkey).toString('base64'),
          message: message,
          signature: signatureHex
        });
      } else {
        // Cosmos signing
        signedData = await window.keplr.signArbitrary(
          chainConfig.chainId,
          account.address,
          message
        );
        
        setResult({
          wallet: "Keplr",
          address: account.address,
          pubKey: signedData.pub_key.value,
          message: message,
          signature: signedData.signature
        });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeapSign = async () => {
    if (!message) {
      setError("Please enter a message to sign");
      return;
    }
    if (!window.leap) {
      setError("Please install Leap extension");
      return;
    }

    try {
      // Clear previous states
      setError("");
      setResult(null);

      const defaultChainConfig = {
        chainId: chainConfig.chainId,
        chainName: chainConfig.chainName,
        rpc: chainConfig.rpc,
        rest: chainConfig.rest,
        bip44: {
          coinType: parseInt(chainConfig.coinType)
        },
        bech32Config: {
          bech32PrefixAccAddr: chainConfig.prefix,
          bech32PrefixAccPub: `${chainConfig.prefix}pub`,
          bech32PrefixValAddr: `${chainConfig.prefix}valoper`,
          bech32PrefixValPub: `${chainConfig.prefix}valoperpub`,
          bech32PrefixConsAddr: `${chainConfig.prefix}valcons`,
          bech32PrefixConsPub: `${chainConfig.prefix}valconspub`
        },
        currencies: [{
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        }],
        feeCurrencies: [{
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        }],
        stakeCurrency: {
          coinDenom: chainConfig.tokenName,
          coinMinimalDenom: chainConfig.tokenDenom,
          coinDecimals: chainConfig.coinType === "60" ? 18 : 6,
        },
        beta: true
      };

      // Suggest chain configuration for both EVM and Cosmos chains
      if (chainConfig.coinType === "60") {
        await window.leap.experimentalSuggestChain(defaultChainConfig);
      } else {
        await window.leap.experimentalSuggestChain({
          ...defaultChainConfig,
          features: ["ibc-transfer", "ibc-go"]
        });
      }

      await window.leap.enable(chainConfig.chainId);
      const offlineSigner = window.leap.getOfflineSigner(chainConfig.chainId);
      const [account] = await offlineSigner.getAccounts();

      let signedData;
      if (chainConfig.coinType === "60") {
        // EVM signing
        signedData = await window.leap.signEthereum(
          chainConfig.chainId,
          account.address,
          message,
          "message"
        );
        const signatureHex = '0x' + Array.from(signedData, byte => 
          byte.toString(16).padStart(2, '0')).join('');
        
        setResult({
          wallet: "Leap",
          address: account.address,
          ethAddress:  '0x' + toHex(fromBech32(account.address).data),
          pubKey: Buffer.from(account.pubkey).toString('base64'),
          message: message,
          signature: signatureHex
        });
      } else {
        // Cosmos signing
        signedData = await window.leap.signArbitrary(
          chainConfig.chainId,
          account.address,
          message
        );
        
        setResult({
          wallet: "Leap",
          address: account.address,
          pubKey: signedData.pub_key.value,
          message: message,
          signature: signedData.signature
        });
      }
    } catch (err) {
      setError(err.message);
      console.error("Detailed error:", err);
    }
  };

  const handleMetaMaskSign = async () => {
    if (!message) {
      setError("Please enter a message to sign");
      return;
    }
    if (typeof window.ethereum === 'undefined') {
      setError("Please install MetaMask extension");
      return;
    }

    try {
      // Clear previous states
      setError("");
      setResult(null);

      if (chainConfig.coinType === "60") {
        // EVM Direct signing with MetaMask
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        const [account] = await web3.eth.getAccounts();
        const signature = await web3.eth.personal.sign(message, account, account);
        
        setResult({
          wallet: "MetaMask",
          address: toBech32(chainConfig.prefix, fromHex(account.replaceAll(/^0x/g, ""))),
          ethAddress: account,
          pubKey: account, // Use account address as pubkey for MetaMask
          message: message,
          signature: signature
        });
      } else {
        // Cosmos signing with MetaMask Leap Snap
        // Initialize the snap
        await window.ethereum.request({
          method: 'wallet_requestSnaps',
          params: {
            'npm:@leapwallet/metamask-cosmos-snap': {},
          },
        });

        // Suggest chain
        await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: 'npm:@leapwallet/metamask-cosmos-snap',
            request: {
              method: 'suggestChain',
              params: {
                chainInfo: {
                  chainId: chainConfig.chainId,
                  chainName: chainConfig.chainName,
                  bip44: {
                    coinType: 118,
                  },
                  bech32Config: {
                    bech32PrefixAccAddr: chainConfig.prefix,
                  },
                },
              },
            },
          },
        });

        // Get account
        const accountData = await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: 'npm:@leapwallet/metamask-cosmos-snap',
            request: {
              method: 'getKey',
              params: {
                chainId: chainConfig.chainId,
              },
            },
          },
        });

        if (!accountData) {
          throw new Error("Failed to get account from MetaMask Cosmos Snap");
        }

        // Sign the message
        const signResponse = await window.ethereum.request({
          method: 'wallet_invokeSnap',
          params: {
            snapId: 'npm:@leapwallet/metamask-cosmos-snap',
            request: {
              method: 'signAmino',
              params: {
                chainId: chainConfig.chainId,
                signerAddress: accountData.address,
                signDoc: {
                  chain_id: '',
                  account_number: '0',
                  sequence: '0',
                  fee: {
                    gas: '0',
                    amount: [],
                  },
                  msgs: [
                    {
                      type: 'sign/MsgSignData',
                      value: {
                        signer: accountData.address,
                        data: btoa(message), // base64 encode the message
                      },
                    },
                  ],
                  memo: '',
                },
              },
            },
          },
        });

        setResult({
          wallet: "MetaMask Cosmos",
          address: accountData.address,
          pubKey: signResponse.signature.pub_key?.value,
          message: message,
          signature: signResponse.signature.signature
        });
      }
    } catch (err) {
      setError(err.message);
      console.error("Detailed error:", err);
    }
  };

  const handleWeb3AuthSign = async () => {
    if (!message) {
      setError("Please enter a message to sign");
      return;
    }
    if (isPrivateKeyMode && !privateKey) {
      setError("Please enter a private key");
      return;
    }

    try {
      if (chainConfig.coinType === "60") {
        // For EVM chains, use ethers.js
        try {
          const ethWallet = new ethers.Wallet(privateKey);
          const signature = await ethWallet.signMessage(message);

          const privateKeyBytes = Buffer.from(privateKey, 'hex');
          const cosmosWallet = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, chainConfig.prefix);
          const cosmosAccount = (await cosmosWallet.getAccounts())[0];
          const cosmosPubKey = Buffer.from(cosmosAccount.pubkey).toString('base64');
          const cosmosAddress = toBech32(chainConfig.prefix, fromHex(ethWallet.address.replaceAll(/^0x/g, "")));
          
          setResult({
            wallet: "Web3Auth",
            address: cosmosAddress,
            ethAddress: ethWallet.address,
            pubKey: cosmosPubKey,
            message: message,
            signature: signature
          });
        } catch (err) {
          setError("Invalid private key for EVM wallet");
          console.error(err);
        }
      } else {
        // For Cosmos chains
        try {
          const cleanPrivateKey = privateKey.replace('0x', '');
          const privateKeyBytes = Buffer.from(cleanPrivateKey, 'hex');
          const wallet = await DirectSecp256k1Wallet.fromKey(privateKeyBytes, chainConfig.prefix);
          const [ account ] = await wallet.getAccounts();

          // Sign the message
          const messageHash = sha256(toUtf8(message));
          const signature = await Secp256k1.createSignature(messageHash, privateKeyBytes);
          const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);
          const signatureBase64 = toBase64(signatureBytes);

          setResult({
            wallet: "Web3Auth",
            address: account.address,
            pubKey: Buffer.from(account.pubkey).toString('base64'),
            message: message,
            signature: signatureBase64
          });
        } catch (err) {
          setError("Invalid private key for Cosmos wallet: " + err.message);
          console.error(err);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error("Detailed error:", err);
    }
  };

  return (
    <div className="container">
      <h1>Wallet Signer</h1>
      
      <div className="config-section">
        <h2>Chain Configuration</h2>
        
        <div className="input-row">
          <div className="input-group">
            <label htmlFor="chainId">Chain ID:</label>
            <input
              id="chainId"
              type="text"
              value={chainConfig.chainId}
              onChange={(e) => setChainConfig({...chainConfig, chainId: e.target.value})}
              placeholder={defaultConfigs[chainConfig.coinType].placeholder}
            />
            <div className="input-note">
              {chainConfig.coinType === "60" ? 
                "For EVM chains, use underscore format (chainname_local-1)" : 
                "For Cosmos chains, use hyphen format (chainname-1)"
              }
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="chainName">Chain Name:</label>
            <input
              id="chainName"
              type="text"
              value={chainConfig.chainName}
              onChange={(e) => setChainConfig({...chainConfig, chainName: e.target.value})}
              placeholder="e.g., Custom Chain"
            />
          </div>
        </div>

        <div className="input-row token-config-row">
          <div className="input-group">
            <label htmlFor="prefix">Address Prefix:</label>
            <input
              id="prefix"
              type="text"
              value={chainConfig.prefix}
              onChange={(e) => setChainConfig({...chainConfig, prefix: e.target.value})}
              placeholder="e.g., allin"
            />
          </div>

          <div className="input-group">
            <label htmlFor="coinType">Coin Type:</label>
            <select
              id="coinType"
              value={chainConfig.coinType}
              onChange={handleCoinTypeChange}
            >
              <option value="60">EVM (60)</option>
              <option value="118">Cosmos (118)</option>
            </select>
            {showCoinTypeWarning && (
              <div className="warning-message">
                ⚠️ Important: After changing coin type, please remove the chain from Keplr and add it again if you keep the same chain ID.
              </div>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="tokenName">Token Name:</label>
            <input
              id="tokenName"
              type="text"
              value={chainConfig.tokenName}
              onChange={(e) => setChainConfig({...chainConfig, tokenName: e.target.value})}
              placeholder="e.g., TOKEN"
            />
          </div>

          <div className="input-group">
            <label htmlFor="tokenDenom">Token Denom:</label>
            <input
              id="tokenDenom"
              type="text"
              value={chainConfig.tokenDenom}
              onChange={(e) => setChainConfig({...chainConfig, tokenDenom: e.target.value})}
              placeholder="e.g., token"
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label htmlFor="rpc">RPC Endpoint:</label>
            <input
              id="rpc"
              type="text"
              value={chainConfig.rpc}
              onChange={(e) => setChainConfig({...chainConfig, rpc: e.target.value})}
              placeholder="e.g., https://rpc.example.com"
            />
          </div>

          <div className="input-group">
            <label htmlFor="rest">REST Endpoint:</label>
            <input
              id="rest"
              type="text"
              value={chainConfig.rest}
              onChange={(e) => setChainConfig({...chainConfig, rest: e.target.value})}
              placeholder="e.g., https://rest.example.com"
            />
          </div>
        </div>
      </div>

      <div className="signing-section">
        <h2>Message Signing</h2>
        <div className="input-group full-width">
          <label htmlFor="message">Message:</label>
          <input
            id="message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to sign"
          />
        </div>

        <div className="toggle-container">
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isPrivateKeyMode}
              onChange={(e) => {
                setIsPrivateKeyMode(e.target.checked);
                if (!e.target.checked) setPrivateKey("");
              }}
            />
            <span className="toggle-slider"></span>
          </label>
          <span className="toggle-label">Private Key Mode</span>
        </div>

        {isPrivateKeyMode && (
          <div className="input-group full-width">
            <label htmlFor="privateKey">Private Key (Hex):</label>
            <input
              id="privateKey"
              type="password"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder="Enter private key in hex format"
            />
          </div>
        )}

        <div className="button-group">
          <button 
            onClick={handleKeplrSign} 
            className="keplr-button"
            disabled={isPrivateKeyMode}
          >
            <img src="https://i.ibb.co/syXgYDP/Keplr-icon-ver-1-3-2.png" alt="Keplr" />
            Sign with Keplr
          </button>
          <button 
            onClick={handleLeapSign} 
            className="leap-button"
            disabled={isPrivateKeyMode}
          >
            <img src="https://framerusercontent.com/images/ppPFegAop7viVfctkflQ6PPslSo.png?scale-down-to=512" alt="Leap" />
            Sign with Leap
          </button>
          <button 
            onClick={handleMetaMaskSign} 
            className="metamask-button"
            disabled={isPrivateKeyMode}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" />
            Sign with MetaMask
          </button>
          <button 
            onClick={handleWeb3AuthSign}
            className="web3auth-button"
            disabled={!isPrivateKeyMode}
          >
            <img src="https://web3auth.io/images/web3authlog.png" alt="Web3Auth" />
            Sign with Private Key
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="result-section">
          <h2>Signing Result ({result.wallet})</h2>
          <div className="result-item">
            <strong>Address:</strong> {result.address}
          </div>
          {result.ethAddress && (
            <div className="result-item">
              <strong>ETH Address:</strong> {result.ethAddress}
            </div>
          )}
          <div className="result-item">
            <strong>Public Key:</strong> {result.pubKey}
          </div>
          <div className="result-item">
            <strong>Message:</strong> {result.message}
          </div>
          <div className="result-item">
            <strong>Signature:</strong> {result.signature}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
