import { useState, useEffect } from 'react';
import { ethers, BigNumber } from 'ethers';
import truncateEthAddress from 'truncate-eth-address'
import CanvasToken from './CanvasToken.json';
import './App.css';

function App() {
  const [tokenInfo, setTokenInfo] = useState({
    address: "-",
    name: "-",
    symbol: "-",
    totalSupply: "-"
  });
  const [balanceInfo, setBalanceInfo] = useState({
    address: "-",
    balance: "-"
  })
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [loadingTransfer, setLoadingTransfer] = useState(false);
  const [txs, setTxs] = useState([]);
  const [contractListened, setContractListened] = useState();

  function loadProvider(address) {
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    let canvasToken = new ethers.Contract(address, CanvasToken, provider);

    return { canvasToken, provider };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    let data = new FormData(e.target);
    if(data.get("addr") !== "") {
      setLoading(true);
      let { canvasToken } = await loadProvider(data.get("addr"));
  
      let tokenName = await canvasToken.name();
      let tokenSymbol = await canvasToken.symbol();
      let totalSupply = await canvasToken.totalSupply();
  
      setTokenInfo({
        address: data.get("addr"),
        name: tokenName,
        symbol: tokenSymbol,
        totalSupply: ethers.utils.formatEther(totalSupply)
      });
    }
    setLoading(false);
  }

  async function getMyBalance() {
    if(tokenInfo.address !== "-") {
      setLoadingBalance(true);
      let { canvasToken, provider } = await loadProvider(tokenInfo.address);
      await provider.send("eth_requestAccounts", []);
      let signer = await provider.getSigner();
      let signerAddress = await signer.getAddress();
      let balance = await canvasToken.balanceOf(signerAddress);
      setBalanceInfo({
        address: truncateEthAddress(signerAddress),
        balance: ethers.utils.formatEther(balance)
      });
    }
    setLoadingBalance(false);
  }

  useEffect(async () => {
    if (tokenInfo.address !== "-") {
      const { canvasToken } = await loadProvider(tokenInfo.address);

      canvasToken.on("Transfer", (from, to, amount, event) => {
        console.log({ from, to, amount, event });

        setTxs((currentTxs) => [
          ...currentTxs,
          {
            txHash: event.transactionHash,
            from: truncateEthAddress(from),
            to: truncateEthAddress(to),
            amount: String(amount)
          }
        ]);
        setLoadingTransfer(false);
      });
      setContractListened(canvasToken);

      return () => {
        contractListened.removeAllListeners();
      };
    }
  }, [tokenInfo.address]);

  async function handleTransfer(e) {
    setLoadingTransfer(true);
    e.preventDefault();
    let data = new FormData(e.target);
    let { provider } = await loadProvider(tokenInfo.address);
    await provider.send("eth_requestAccounts", []);
    let signer = await provider.getSigner();
    let canvasToken = new ethers.Contract(tokenInfo.address, CanvasToken, signer);
    try {
      const response = await canvasToken.transfer(data.get("recipient"), ethers.utils.parseEther(data.get("amount")).toString());
      console.log("response", response);
      response && await getMyBalance();
    } catch(err) {
      alert(JSON.parse(JSON.stringify(err)).error.message);
      setLoadingTransfer(false);
    }
  };

  return (
    <div className="text-white p-20">
      <div className='flex justify-center gap-20'>
        <form className="p-8 bg-white rounded-lg shadow min-w-max" onSubmit={handleSubmit}>
          <h1 className="text-xl font-semibold text-gray-700 text-center">
            Read from smart contract
          </h1>
          <div className="">
            <div className="my-3">
              <input
                type="text"
                name="addr"
                className="input input-bordered w-80 block w-full focus:ring focus:outline-none"
                placeholder="ERC20 contract address"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary submit-button focus:ring focus:outline-none w-full"
          >
            {loading ? "Loading..." : "Get token info"}
          </button>
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Total supply</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>{tokenInfo.name}</th>
                    <td>{tokenInfo.symbol}</td>
                    <td>{String(tokenInfo.totalSupply)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <hr className='my-4'></hr>
          <button
            onClick={getMyBalance}
            type="submit"
            className="btn btn-primary submit-button focus:ring focus:outline-none w-full"
          >
            {
              loadingBalance ? "Loading..." : "Get my balance"
            }
          </button>
          <div className="mt-3">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>{balanceInfo.address}</th>
                    <td>{balanceInfo.balance}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </form>
        <form className="p-8 bg-white rounded-lg shadow min-w-max" onSubmit={handleTransfer}>
          <h1 className="text-xl font-semibold text-gray-700 text-center">
            Write to contract
          </h1>
          <div className="my-3">
            <input
              type="text"
              name="recipient"
              className="input input-bordered w-80 block w-full focus:ring focus:outline-none"
              placeholder="Recipient address"
            />
          </div>
          <div className="my-3">
            <input
              type="text"
              name="amount"
              className="input input-bordered w-80 block w-full focus:ring focus:outline-none"
              placeholder="Amount to transfer"
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary submit-button focus:ring focus:outline-none w-full mt-3"
          >
            {
              loadingTransfer ? "Loading..." : "transfer"
            }
          </button>
          <hr className='my-3'></hr>
          <h1 className="text-xl font-semibold text-gray-700 text-center">
            Recent transactions
          </h1>
          <div className="mt-3">
            <div className="overflow-x-auto">
              {
                txs.length > 0 &&
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount</th>
                      <th>Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {
                      txs.map(trans => (
                        <tr key={trans.txHash}>
                          <th>{trans.from}</th>
                          <td>{trans.to}</td>
                          <td>{ethers.utils.formatEther(trans.amount)}</td>
                          <td><a href={`https://rinkeby.etherscan.io/tx/${trans.txHash}`}>Check on explore</a></td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
