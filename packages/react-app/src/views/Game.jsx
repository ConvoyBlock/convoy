import { Row, Col, Button, Card, DatePicker, Divider, Input, InputNumber, List, Progress, Select, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils } from "ethers";
import { SyncOutlined } from "@ant-design/icons";

import { Address, Balance, Events } from "../components";

import {
  useBalance,
  useContractLoader,
  useContractReader,
  useGasPrice,
  useOnBlock,
  useUserProviderAndSigner,
} from "eth-hooks";

const { Option } = Select;

function renderRound(matchState) {
  // round is incremented, render what just happened in the prev round
  // go through defense and invasion step by step
  // calculate new score
  // refresh any state maps
}

function ReadGame({
  matchId,
  side, // 'defender' or 'invader'
  address,
  mainnetProvider,
  localProvider,
  tx,
  readContracts,
  writeContracts,
}) {

  const [lastRound, setLastRound] = useState(0);
  // read contract to get state about current game
  // keep track of a variable from the contract in the local React state:
  // returns multiple vars... not an object...
  const _matchState = useContractReader(readContracts, "YourContract", "matchState", [matchId]);
  let matchState = {};
 // matchState = convertMatchState(_matchState) // TODO
  if (matchState && matchState.round != lastRound) {
    // UPDATE!
    // TODO call a callback?
    // clean up
    setLastRound(matchState.round);
  }

// read matches[matchId]
  // if no address for both defender and invader then status=waiting join
  // if round is > saved round then play out defense vs invasion for previous round
}

function InitGame({
}) {
  return (<div>
      <button>Start New Game as Defender</button>
    </div>)
}
function Defend({
}) {
  // edit/update/set defense strategy
  // assuming you are defender
  // sends tx to blockchain
  // reveal
  return (<div>
      <h2>Defender Strategy</h2>
      <form>
        <label>
          1st defender
          <input type="text" name="def1"/>
        </label>
      </form>
     </div>)
}
function Board({
  canvas,
  ctx
}) {
  console.log('rerendering Board');
  useEffect(() => {
    //x = canvas.width/2;
    //y = canvas.height-30;
    //setInterval(update, 100);
  }, []);
let tankx = 0, tanky = 0, turr1x = 0, turr1y = 0;
  function drawTank() {
    ctx.fillStyle = "#889500";
    ctx.fillRect(tankx, tanky, 20, 15);
  }
  function drawTurr() {
    ctx.fillStyle = "#880080";
    ctx.beginPath();
    ctx.moveTo(turr1x, turr1y);
    ctx.lineTo(turr1x+10, turr1y);
    ctx.lineTo(turr1x+5, turr1y+5);
    ctx.fill();
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    //drawTank();
    //drawTurr();
  }
  function update() {
    draw();
  }

  return (
    <div>
    Score
    </div>
  );
}




function Joinables({
  address,
  mainnetProvider,
  readContracts,
}) {
  const joinables = useContractReader(readContracts, "Convoy", "joinlist");
  console.log(joinables);
  if (!joinables) {
    return '';
  }
  const requestJoin = (matchId, e) => {
    console.log('join ', matchId);
    console.log(e);
  };
  return (
    <List dataSource={joinables} renderItem={item => (
      <List.Item actions={[<a key="join" onClick={(e) => requestJoin(item.toNumber(), e)} >join</a>]} >
        <div>matchId: <span>{item.toString()}</span></div>
        <div><a>get details</a></div>
      </List.Item>
    )} />
  );
}

function InitMatch({
  address,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {

  return (<div><Button>Start a new match</Button></div>);

}

const MAX_ARMY = 5; // uint256, bytes32 can support up to 8 x 32bit troops
const OFF_POSITION = 16;
const OFF_TYPE = 13;
const OFF_HP = 10;
const OFF_RANGE = 8;
const OFF_ATTACK = 4;
const OFF_SPEED = 0;
const jav = {'hp': 2, 'range': 2, 'attack': 1};
const stats = {1: jav, 2: {/* TODO */}};
// const typeMap = {'Javelin': 0x01, 'RPG': 0x02};
function Match({
  match,
  address,
  tx,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {
  const [matchId, setMatchId] = useState();
  const [defenseAry, setDefenseAry] = useState([]);
  const [defenseHashContract, setDefenseHashContract] = useState();
  const [defenseHashComputed, setDefenseHashComputed] = useState();
  const [round, setRound] = useState(0);
  const [defenseTypes, setDefenseTypes] = useState(Array(MAX_ARMY).fill(1));
  const [defensePos, setDefensePos] = useState([]);
  console.log(match);
  if (!match) return '';

  if (matchId != match.matchId.toNumber()) {
    setMatchId(match.matchId.toNumber());
    console.log('set new matchId ', matchId);
  }
  if (defenseHashContract != match.defenseHash) {
    setDefenseHashContract(match.defenseHash);
    console.log('update defenseHashContract ', match.defenseHash);
  }
  if (round != match.round) {
    if (round != match.round - 1) {
      console.log("SKIPPED ROUND?");
    }
    setRound(match.round);

    // hashes and revealed (but not actual defense/invasion) should be cleared now too. 
    // TODO round finished so render what is saved in match.defense/invasion
  }
  function makeBytes32like(ary) {
    return '0x' + ary.map(n => n.toString(16).padStart(8, '0')).join('');
  }
  function recalcDefenseHash() {
    const makeDefenseTroop = (pos, type, hp, range, attack) => (pos << OFF_POSITION) + (type << OFF_TYPE) + (hp << OFF_HP) + (range << OFF_RANGE) + (attack << OFF_ATTACK);
    let defense = [];
    for (let i = 0; i < defenseTypes.length; i++) {
      let typ = defenseTypes[i];
      defense.push(makeDefenseTroop(defensePos[i], typ, stats[typ].hp, stats[typ].range, stats[typ].attack));
    }
    console.log(defense);
     console.log(  utils.keccak256("0x2A10"));
     console.log(  utils.keccak256("0x00002A1000002A10"));
    let newHash = utils.keccak256(makeBytes32like(defense));
    console.log("defense and calc of defense", defense, newHash);
    setDefenseAry(defense);
    setDefenseHashComputed(newHash);
  }
  function changeDefenseType(troopIdx, val) {
    const newDefenseTypes = [...defenseTypes];
    newDefenseTypes[troopIdx] = val;
    setDefenseTypes(newDefenseTypes);
  }
  function changeDefenseSlider(troopIdx, pos) {
    // check that pos do not overlap
    if (defensePos.indexOf(pos) !== -1) {
      return;
    }
    
    const newDefense = [...defensePos];
    newDefense[troopIdx] = pos;
    setDefensePos(newDefense);
    recalcDefenseHash();
  }
  /*
  struct Match {
    uint256 matchId; // not necessary, for debugging
    address defender;
    address invader;
    uint32[5] defense; // null-terminated but 5 max
    // [0,1,2,3,4,5,6,7,8,9]
    // [0,1,2,3,4]
    uint32[5] invasion; // quick reset by setting invasion[0] = 0
    bytes32 defenseHash;
    bytes32 invasionHash;
    uint256 resultHash;
    uint8 pointsInvader;
    uint8 round;
    bool defenderRevealed;
    bool invaderRevealed;
    bool disputeFlag;
  }
  [BigNumber, '0xA36A02F8ee21490181499778467c07BE65f63620', '0x0000000000000000000000000000000000000000', Array(5), Array(5), '0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', BigNumber, 0, 0, false, false, false, matchId: BigNumber, defender: '0xA36A02F8ee21490181499778467c07BE65f63620', invader: '0x0000000000000000000000000000000000000000', defense: Array(5), invasion: Array(5), …]
  */


  return (
    <div>
      <h2>Match {match.matchId.toNumber()}</h2>
      <h3>Round #{match.round}</h3>
      <div>Defender:
        <Address
          address={match.defender}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
      </div>
      <div>Invader:
        <Address
          address={match.invader}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
      </div>
      <div>invader score: {match.pointsInvader}</div>
      <div>{match.defenderRevealed || match.invaderRevealed ? 'waiting for reveals' : 'ready to (re)commit'}</div>
      <div>defender hash from contract: {defenseHashContract == 0 ? '...waiting to commit' : defenseHashContract}</div>
      <div>defender hash strat computed: {defenseHashComputed == 0 ? '...' : defenseHashComputed}</div>
      <div><span style={{color:'green'}}>{defenseHashContract == defenseHashComputed ? 'match' : ''}</span></div>
      <div>from [ {defenseAry.map(n => '0x' + n.toString(16)).join([', '])} ]</div>

      {[0, 1, 2, 3, 4].map(n => { return (
        <Row>
          <Col span={6}>
            <Select defaultValue="1" onChange={(v) => changeDefenseType(n, v)}>
              <Option value="1">Javelin</Option>
              <Option value="2">RPG TODO</Option>
            </Select>
          </Col>
          <Col span={12}>
            <Slider
              min={1}
              max={16}
              onChange={(pos) => changeDefenseSlider(n, pos)}
              value={defensePos[n]}
            />
          </Col>
          <Col span={4}>
            <InputNumber
              min={1}
              max={16}
              style={{ margin: '0 16px' }}
              value={defensePos[n]}
            />
          </Col>
        </Row>
      )})}
      <div style={{ margin: 8 }}>
        <Button
          onClick={() => {
            tx(writeContracts.Convoy.commit(matchId, true, defenseHashComputed));
          }}
        > Commit Defense Strategy to Blockchain </Button>
      </div>
    </div>
  );
}

export default function Game({
  purpose,
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  price,
  tx,
  readContracts,
  writeContracts,
}) {
  const [newPurpose, setNewPurpose] = useState("loading...");
  const matchId = 0;
  const match = useContractReader(readContracts, "Convoy", "getMatch", [matchId]);

  const _canvas = document.getElementById("myCanvas");
  const _ctx = _canvas ? _canvas.getContext("2d") : null;
  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 800, margin: "auto", marginTop: 64 }}>

        <Joinables readContracts={readContracts}
          address={address}
          mainnetProvider={mainnetProvider}
        />
        <InitMatch readContracts={readContracts}
          address={address}
          mainnetProvider={mainnetProvider}
          writeContracts={writeContracts}
        />
        <Match
          match={match}
          tx={tx}
          readContracts={readContracts}
          address={address}
          mainnetProvider={mainnetProvider}
          writeContracts={writeContracts}
        />
        <canvas id="myCanvas" width="480" height="320" style={{border:'1px solid black'}}></canvas>
        {_ctx ? <Board canvas={_canvas} ctx={_ctx} /> : ''}

        <h2>Example UI:</h2>
        <h4>purpose: {purpose}</h4>
        <Divider />
        <div style={{ margin: 8 }}>
          <Input
            onChange={e => {
              setNewPurpose(e.target.value);
            }}
          />
          <Button
            style={{ marginTop: 8 }}
            onClick={async () => {
              /* look how you call setPurpose on your contract: */
              /* notice how you pass a call back for tx updates too */
              const result = tx(writeContracts.YourContract.setPurpose(newPurpose), update => {
                console.log("📡 Transaction Update:", update);
                if (update && (update.status === "confirmed" || update.status === 1)) {
                  console.log(" 🍾 Transaction " + update.hash + " finished!");
                  console.log(
                    " ⛽️ " +
                      update.gasUsed +
                      "/" +
                      (update.gasLimit || update.gas) +
                      " @ " +
                      parseFloat(update.gasPrice) / 1000000000 +
                      " gwei",
                  );
                }
              });
              console.log("awaiting metamask/web3 confirm result...", result);
              console.log(await result);
            }}
          >
            Set Purpose!
          </Button>
        </div>
        <Divider />
        Your Address:
        <Address address={address} ensProvider={mainnetProvider} fontSize={16} />
        <Divider />
        ENS Address Example:
        <Address
          address="0x34aA3F359A9D614239015126635CE7732c18fDF3" /* this will show as austingriffith.eth */
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <div>OR</div>
        <Balance address={address} provider={localProvider} price={price} />
        <Divider />
        <div>🐳 Example Whale Balance:</div>
        <Balance balance={utils.parseEther("1000")} provider={localProvider} price={price} />
        <Divider />
        {/* use utils.formatEther to display a BigNumber: */}
        <h2>Your Balance: {yourLocalBalance ? utils.formatEther(yourLocalBalance) : "..."}</h2>
        <Divider />
        Your Contract Address:
        <Address
          address={readContracts && readContracts.YourContract ? readContracts.YourContract.address : null}
          ensProvider={mainnetProvider}
          fontSize={16}
        />
        <Divider />
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how you call setPurpose on your contract: */
              tx(writeContracts.YourContract.setPurpose("🍻 Cheers"));
            }}
          >
            Set Purpose to &quot;🍻 Cheers&quot;
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /*
              you can also just craft a transaction and send it to the tx() transactor
              here we are sending value straight to the contract's address:
            */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Send Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* look how we call setPurpose AND send some value along */
              tx(
                writeContracts.YourContract.setPurpose("💵 Paying for this one!", {
                  value: utils.parseEther("0.001"),
                }),
              );
              /* this will fail until you make the setPurpose function payable */
            }}
          >
            Set Purpose With Value
          </Button>
        </div>
        <div style={{ margin: 8 }}>
          <Button
            onClick={() => {
              /* you can also just craft a transaction and send it to the tx() transactor */
              tx({
                to: writeContracts.YourContract.address,
                value: utils.parseEther("0.001"),
                data: writeContracts.YourContract.interface.encodeFunctionData("setPurpose(string)", [
                  "🤓 Whoa so 1337!",
                ]),
              });
              /* this should throw an error about "no fallback nor receive function" until you add it */
            }}
          >
            Another Example
          </Button>
        </div>
      </div>

      {/*
        📑 Maybe display a list of events?
          (uncomment the event and emit line in YourContract.sol! )
      */}
      <Events
        contracts={readContracts}
        contractName="YourContract"
        eventName="SetPurpose"
        localProvider={localProvider}
        mainnetProvider={mainnetProvider}
        startBlock={1}
      />

      <div style={{ width: 600, margin: "auto", marginTop: 32, paddingBottom: 256 }}>
        <Card>
          Check out all the{" "}
          <a
            href="https://github.com/austintgriffith/scaffold-eth/tree/master/packages/react-app/src/components"
            target="_blank"
            rel="noopener noreferrer"
          >
            📦 components
          </a>
        </Card>

        <Card style={{ marginTop: 32 }}>
          <div>
            There are tons of generic components included from{" "}
            <a href="https://ant.design/components/overview/" target="_blank" rel="noopener noreferrer">
              🐜 ant.design
            </a>{" "}
            too!
          </div>

          <div style={{ marginTop: 8 }}>
            <Button type="primary">Buttons</Button>
          </div>

          <div style={{ marginTop: 8 }}>
            <SyncOutlined spin /> Icons
          </div>

          <div style={{ marginTop: 8 }}>
            Date Pickers?
            <div style={{ marginTop: 2 }}>
              <DatePicker onChange={() => {}} />
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
            <Slider range defaultValue={[20, 50]} onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Switch defaultChecked onChange={() => {}} />
          </div>

          <div style={{ marginTop: 32 }}>
            <Progress percent={50} status="active" />
          </div>

          <div style={{ marginTop: 32 }}>
            <Spin />
          </div>
        </Card>
      </div>
    </div>
  );
}
