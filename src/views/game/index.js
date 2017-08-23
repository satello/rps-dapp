import React, { Component } from 'react';
import Web3 from 'web3';

// local
import './style.css';
import { CONTRACT_BYTECODE, CONTRACT_ABI } from '../../constants.js';

// initialze web3
const web3 = new Web3(Web3.givenProvider);

// RPS contract ABI
const rpsGameContract = web3.eth.contract(CONTRACT_ABI);


class RPSGame extends Component {

  constructor(props) {
    super(props);

    this.state = {
      currentGameAddress: null,
      player1address: null,
      player2address: null,
      stakedWei: 0,
      selectionHash: null,
    }
  }

  resetGame() {
    this.setState({
      currentGameAddress: null,
      player1address: null,
      player2address: null,
      stakedWei: 0,
      selectionHash: null,
    })
  }

  startGame(e) {
    e.preventDefault();
    console.log("getting here");
    console.log(this.state);

    if (!this.state.player2address || !this.state.stakedWei || !this.state.selectionHash) {
      // TODO display error message to user
      return;
    }

    this.deployRPSGame(this.state.selectionHash, this.state.player2address, this.state.stakedWei);
  }

  /*
  * Use with metamask. Deploy RPS game to specified network
  * @params
  * selectionHash <bytes32 string>: hashed RPS commitment. keccak256(SELECTION, salt)
  * opponentAddress <string>: address of opponent
  * stakedWei <int>: number of wei to stake on the game
  */
  deployRPSGame(selectionHash, opponentAddress, stakedWei) {
    // contract object
    const rpsGame = rpsGameContract.new(
      selectionHash,
      opponentAddress,
      {
       from: web3.eth.accounts[0],
       data: CONTRACT_BYTECODE,
       gas: '4300000',
       value: stakedWei,
      }
    );

    console.log(rpsGame.address);
    console.log(rpsGame.transactionHash);

    // TODO will this return in time or do we need a promise?
    this.setState({
      currentGameAddress: rpsGame.address,
      player1address: web3.eth.accounts[0].address,
    })
  }

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;

    this.setState({
      [name]: target.value
    });
  }

  render() {
    if (this.state.currentGameAddress) {
      // address of user
      const currentUserAddress = web3.eth.accounts[0].address;

      // if (currentUserAddress != )
      return (
        <div className="RPSGame">
          <p>In a game</p>
        </div>
      )
    } else {
      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Start A New Game</h1>
            <p>This is a DApp for Rock, Paper, Scissors, Spock, Lizard. See the rules
              <a href="https://en.wikipedia.org/wiki/Rock%E2%80%93paper%E2%80%93scissors#Additional_weapons"> here</a>.
              Select an opponent, stake some ETH and submit a hash of your selection. Your opponent will select
              their option and stake ether. Then you must reveal your vote. The winner receives the combined bids
            </p>
          </div>
          <div className="start-game">
            <form onSubmit={(e) => this.startGame(e)}>
              <label htmlFor="selection-hash">
                Selection Hash: keccak256 hash your selection (one of: [Rock, Paper, Scissors, Spock, Lizard]),
                and a salt you select. Make sure you don't forget your salt! <br /> hint: you can get make a hash
                <a href="https://emn178.github.io/online-tools/keccak_256.html"> here</a>
              </label>
              <input
                id="selection-hash"
                name="selectionHash"
                type="text"
                placeholder="keccak256(SELECTION, salt)"
                onChange={this.handleInputChange.bind(this)}
              />
              <label htmlFor="opponent-address">Address of Opponent</label>
              <input
                id="opponent-address"
                type="text"
                name="player2address"
                placeholder="0x3e7C893a4e6FBf2C25c13abcdb0E7390DA39aEbD"
                onChange={this.handleInputChange.bind(this)}
              />
              <label htmlFor="staked-ether">Ether to bid</label>
              <input
                id="staked-ether"
                name="stakedWei"
                type="number"
                placeholder="1"
                onChange={this.handleInputChange.bind(this)}
              />
              <button>Start Game</button>
            </form>
          </div>
        </div>
      )
    }

  }
}

export default RPSGame;
