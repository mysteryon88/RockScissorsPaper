// SPDX-License-Identifier: MIT

pragma solidity ^0.8.17;

contract RockScissorsPaper {

        struct Game {
                address gameMaster;
                bool gameStopped;
                address[] players;
                address winner;
                uint bank;
        }

        struct PairChoice {
                bytes32 hashedChoice;
                int8 choice;
        }

        Game[] public games;

        mapping (address => uint) public balances;

        mapping (uint => mapping (address => PairChoice)) public choices;

        event startedGame(uint _idGame, address _who, uint _timestamp);

        event joinedGame(uint _idGame, address _who, uint _timestamp);

        event stoppedGame(uint _idGame, uint _timestamp);

        event revealedChoice(uint _idGame, address _who, int8 _choice, uint _timestamp);

        event endGame(uint _idGame, string _winnerStr, address _winnerAddr, uint _timestamp);

        function startGame(bytes32 _hashedChoice) external payable returns(uint)  {

                Game storage newGame = games.push();

                newGame.gameMaster = msg.sender;
                newGame.gameStopped = false;
                newGame.players.push(msg.sender);
                newGame.bank += msg.value;

                choices[games.length - 1][msg.sender].hashedChoice = _hashedChoice;

                emit startedGame(games.length - 1, msg.sender, block.timestamp);
                
                return games.length - 1;
        }

        function joinGame(uint _idGame, bytes32 _hashedChoice) external payable gameOver(_idGame) {

                require(games[_idGame].players.length != 2, "Recruitment is over");

                for(uint i = 0; i < games[_idGame].players.length; i++)
                        require(msg.sender != games[_idGame].players[i], "You are already in the game");

                require( choices[_idGame][msg.sender].hashedChoice == bytes32(0), "You have already made a choice");

                games[_idGame].players.push(msg.sender);
                games[_idGame].bank += msg.value;

                choices[_idGame][msg.sender].hashedChoice = _hashedChoice;

                emit joinedGame(_idGame, msg.sender, block.timestamp);
        }

        function stopGame(uint _idGame) external gameOver(_idGame) onlyGameMaster(_idGame) {

                require(games[_idGame].players.length == 2, "Not all players have made a choice yet");

                games[_idGame].gameStopped = true;

                emit stoppedGame(_idGame, block.timestamp);
        }

        function changeGameMaster(uint _idGame, address _newMaster) external gameOver(_idGame) onlyGameMaster(_idGame) {
                games[_idGame].gameMaster = _newMaster;
        }

        function revealChoice(uint _idGame, int8 _choice, bytes32 _secret) external {

                require(games[_idGame].gameStopped, "The game is still running");

                bytes32 commit = keccak256(abi.encodePacked(_choice, _secret));

                require(commit == choices[_idGame][msg.sender].hashedChoice, "You entered something wrong please try again");

                choices[_idGame][msg.sender].choice = _choice;         

                emit revealedChoice(_idGame, msg.sender, _choice, block.timestamp);
        }
              
        function gameFinal(uint _idGame) external onlyGameMaster(_idGame) returns (string memory _winner) {
                
                require(games[_idGame].gameStopped, "The game is still running");
                
                for(uint i = 0; i < games[_idGame].players.length; i++)
                        require(choices[_idGame][games[_idGame].players[i]].choice != 0, "Not all open yet");

                int8 game = 
                        int8(choices[_idGame][games[_idGame].players[0]].choice) -
                        int8(choices[_idGame][games[_idGame].players[1]].choice);

                if(game == 0) {
                        _winner = "Draw";
                        uint balance = games[_idGame].bank / 2;
                        balances[games[_idGame].players[0]] = balance;
                        balances[games[_idGame].players[1]] = balance;
                }
                else if(game == -1 || game == 2) { // -1 2
                        _winner = "Player 1";
                        games[_idGame].winner = games[_idGame].players[0];
                        balances[games[_idGame].players[0]] = games[_idGame].bank;
                }
                else if(game == 1 || game == -2) { //1 -2
                        _winner = "Player 2";
                        games[_idGame].winner = games[_idGame].players[1];
                        balances[games[_idGame].players[1]] = games[_idGame].bank;
                }

                emit endGame(_idGame, _winner, games[_idGame].winner, block.timestamp);       
        }

        function withdrawAll() external {
                payable(msg.sender).transfer(balances[msg.sender]);
                balances[msg.sender] = 0;
        } 

        function getBalance(address _addr) external view returns(uint balance) {
                balance = balances[_addr];
        } 

        modifier onlyGameMaster(uint _idGame) {
                require(msg.sender == games[_idGame].gameMaster, "You are not the creator of the game");
                _;
        }

        modifier gameOver(uint _idGame) {
                require(!games[_idGame].gameStopped, "Game over");
                _;
        }
        
}
