import React, { Component } from 'react';

// local
import './style.css';
import { CONTRACT_BYTECODE, CONTRACT_ABI } from '../../constants.js';

// get web3 instance initialized in public/index.html
const web3 = window.web3;

// RPS contract ABI
const rpsGameContract = web3.eth.contract(CONTRACT_ABI);

const initialState = {
  currentGameAddress: null,
  player1address: null,
  player2address: null,
  stakedEther: 0,
  selectionHash: null,
  player2Guess: null,
  contractSubmitted: false,
  readyForReveal: false,
}


class RPSGame extends Component {

  constructor(props) {
    super(props);

    this.state = initialState;
  }

  componentDidMount() {
    this.setState({
      contractSubmitted: true,
      currentGameAddress: "0x15577aaa4ad12fa0857f22c5c377ea20907e96fd",
      player1address: undefined,
      player2Guess: null,
      player2address: "0x3e7C893a4e6FBf2C25c13abcdb0E7390DA39aEbD",
      selectionHash: "c37a16b112662e829ba29a4db20e52869dcd10207d4975c17f2819c4b11624ea",
      stakedEther: "0.000001",
      readyForReveal: false
    });
  }

  resetGame() {
    this.setState(initialState);
  }

  startGame(e) {
    e.preventDefault();

    if (!this.state.player2address || !this.state.stakedEther || !this.state.selectionHash) {
      // TODO display error message to user
      return;
    }

    this.deployRPSGame(this.state.selectionHash, this.state.player2address, this.state.stakedEther);
  }

  /*
  * Use with metamask. Deploy RPS game to specified network
  * @params
  * selectionHash <bytes32 string>: hashed RPS commitment. keccak256(SELECTION, salt)
  * opponentAddress <string>: address of opponent
  * stakedEther <int>: number of wei to stake on the game
  */
  deployRPSGame(selectionHash, opponentAddress, stakedEther) {
    const rpsGame = rpsGameContract.new(
      selectionHash,
      opponentAddress,
      {
       from: web3.eth.accounts[0],
       data: CONTRACT_BYTECODE,
       gas: '4300000',
       value: web3.toWei(stakedEther, 'ether'),
      },
      function (e, contract){
        if (contract && typeof contract.address !== 'undefined') {
          console.log('Contract mined! address: ' + contract.address + ' transactionHash: ' + contract.transactionHash);

          // TODO will this return in time or do we need a promise?
          this.setState({
            currentGameAddress: rpsGame.address,
            player1address: web3.eth.accounts[0],
          });
        }

        this.setState({
          contractSubmitted: true
        })
      }.bind(this)
    );
  }

  submitPlayer2Guess() {
    if (!this.state.player2Guess) return;

    const contractInstance = rpsGameContract.at(this.state.currentGameAddress);
    contractInstance.play.sendTransaction(
      web3.fromAscii(this.state.player2Guess),
      {
        from: web3.eth.accounts[0],
        gas: '4300000',
        value: web3.toWei(this.state.stakedEther, 'ether'),
      },function(error, transactionHash) {
        if (!error) {
          console.log("player2 guess tx hash: " + transactionHash);
          this.setState({
            readyForReveal: true
          })
        }
      }.bind(this)
    )
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
      const currentUserAddress = web3.eth.accounts[0];
      let options;

      if (currentUserAddress === this.state.player2address.toLowerCase()) {
        options = (
          <div className="player-2-guess">
            <select onChange={(e) => {this.setState({player2Guess: e.target.value})}}>
              <option value={null}></option>
              <option value="Rock">Rock</option>
              <option value="Paper">Paper</option>
              <option value="Scissors">Scissors</option>
              <option value="Lizard">Lizard</option>
              <option value="Spock">Spock</option>
            </select>
            <div className="btn" onClick={this.submitPlayer2Guess.bind(this)}>Submit</div>
          </div>
        )
      }

      return (
        <div className="RPSGame">
          <div className="intro">
            <h1>Player 2 Input Guess</h1>
            <p>Player 1 address: {this.state.player1address}</p>
            <p>Player 2 address: {this.state.player2address}</p>
            <p>Ether Stake: {this.state.stakedEther}</p>
            <p>Note: Inputs will not be visible unless current user is player 2</p>
          </div>
          {options}
        </div>
      )
    } else {
      if (this.state.contractSubmitted) {
        return (
          <div className="RPSGame">
            <div className="intro">
              <h1>Contract Has Been Submitted....</h1>
              <p>Please wait for contract to be mined. This may take several minutes....</p>
            </div>
            <div className="btn" onClick={this.resetGame.bind(this)}>Start Over</div>
          </div>
        );
      }
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
                name="stakedEther"
                type="text"
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
