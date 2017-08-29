## Rock Paper Scissors Lizard Spock DApp.

Must have Metamask installed in your browser. Tested with Chrome v.60.0.3112.90

Check it out at http://rps-dapp.samvitello.com

WARNING: MetaMask is still in beta and sometimes runs into problems submitting transactions. I would advice only using this DApp on testnets.

## Quick Start

This is a simple react.js app

- Install dependencies
```
yarn install
```

#### Development
- Start app
```
yarn run start
```

#### Production
- Build app
```
yarn run build
```

- Run build/ on webserver of your choice

e.g. to run production on your local machine
```
yarn install -g serve
serve -s build
```

## How to Play

You can see the rules [here](https://en.wikipedia.org/wiki/Rock%E2%80%93paper%E2%80%93scissors#Additional_weapons).

To start a new game:
- Choose your option from Rock, Paper, Scissors, Lizard, Spock.
- Get the ethereum address of your opponent (e.g. 0x3e7C893a4e6FBf2C25c13abcdb0E7390DA39aEbD).
- Choose the amount of ether you want to bet on the game.
- Push `Start Game` and send the transaction via MetaMask.
- Wait until your transaction has been mined and you are redirected to your unique game page.
- Send the url to player 2 and wait for them to make their selection.

Playing the game:
- After the game has been created player 2 must make their selection. Have player 2 go to the game page signed in with MetaMask for the address player 1 specified when they started the game.
- Player 2 selects and submits their move.
- Send the transaction via MetaMask.
- Wait until the transaction has been mined and then wait for player 1 to reveal their vote

Revealing the vote and payout:
- When player 1 signed in with MetaMask to their original account goes back to the game page after player 2's transaction has been mined they will be able to submit their selection.
- The winner will be paid out the balance of the contract.
- If there is a tie both players get their funds back.
- There is a 5 minute timeout for the game. If a player does not complete their step in 5 minutes the other player can call the timeout function on the contract to recover funds.
