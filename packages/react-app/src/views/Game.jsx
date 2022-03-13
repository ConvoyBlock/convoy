import { Row, Col, Button, Card, Collapse, DatePicker, Divider, Input, InputNumber, List, Progress, Select, Slider, Spin, Switch } from "antd";
import React, { useState, useEffect } from "react";
import { utils } from "ethers";
import { SyncOutlined } from "@ant-design/icons";
import { Address, Balance, Events } from "../components";
import { useContractReader, } from "eth-hooks";

const { Option } = Select;
const { Panel } = Collapse;

function Board({
  defenseAry,
  invasionAry,
  canvas,
  ctx
}) {
  useEffect(() => {
    // XXX may need to keep copies because later we modify w/o new arys
    setDefense(defenseAry.map(parseDefenseTroop));
    setInvasion(invasionAry.map(parseInvasionTroop));
  }, [defenseAry, invasionAry]);
  const [defense, setDefense] = useState();
  const [invasion, setInvasion] = useState();
  useEffect(() => {
    setTimeout(update, 1000);
  }, [defense, invasion]);


  const attr = (t, off) => (t >> off) & 0x07;
  function parseDefenseTroop(troop) {
    return {
      'pos': (troop >> OFF_POSITION) & 0x1F,
      'type': attr(troop, OFF_TYPE),
      'hp': attr(troop, OFF_HP),
      'range': attr(troop, OFF_RANGE),
      'attack': attr(troop, OFF_ATTACK),
    }
  }
  function parseInvasionTroop(troop) {
    return {'speed': attr(troop, OFF_SPEED), ...parseDefenseTroop(troop)};
    /*
    return {
      'pos': (troop >> OFF_POSITION) & 0x1F,
      'type': attr(troop, OFF_TYPE),
      'hp': attr(troop, OFF_HP),
      'range': attr(troop, OFF_RANGE),
      'attack': attr(troop, OFF_ATTACK),
      'speed': attr(troop, OFF_SPEED),
    }
    */
  }
  function draw() {
    if (defense === undefined) { console.log('wtf--------------------------'); return }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // defenders
    ctx.fillStyle = "#880080";
    for (let i = 0; i < defense.length; i++) {
      ctx.beginPath();
      ctx.moveTo(defense[i].pos * 20, 100);
      ctx.lineTo(defense[i].pos * 20 +10, 100);
      ctx.lineTo(defense[i].pos * 20 +5, 100+5);
      ctx.fill();
    }
    // invaders
    ctx.fillStyle = "#889500";
    for (let i = 0; i < invasion.length; i++) {
      ctx.fillRect(invasion[i].pos * 20, 120, 10, 10);
    }
  }
  function update() {
    draw();
  }

  function move() {
//    Bitwise operators treat their operands as a set of 32 bits (zeros and ones) and return standard JavaScript numerical values.
    // make map and reverse
    let defenseMap = 0;
    let invasionMap = 0;
    let defenseReverse = {};
    let invasionReverse = {};
    let defendersSurvived = 0;
    let invadersSurvived = 0;
    let defenseDamage = {};
    let invasionDamage = {};
    defense.forEach((troop, i) => {
      if (troop.hp == 0) { return } // maybe unnecessary check dead
      defendersSurvived++;
      defenseMap |= (1 << troop.pos);
      defenseReverse[troop.pos] = i;
      defenseDamage[i] = 0;
    })
    invasion.forEach((troop, i) => {
      if (troop.hp == 0) { return } // maybe unnecessary check dead
      invadersSurvived++;
      invasionMap |= (1 << troop.pos);
      invasionReverse[troop.pos] = i;
      invasionDamage[i] = 0;
    })

    let defendersDestroyed = 0;
    for (let i = 0; i < invasion.length; i++) {
      let troop = invasion[i];
      if (troop.hp == 0) { continue } // maybe unnecessary check dead
      let pos = troop.pos;
      let min = pos - troop.range;
      for (pos = pos + troop.range; pos >= min; pos--) {
        // starts big, most advanced troops
        if ((defenseMap & (1 << pos)) != 0) {
          // hit
          let idx = defenseReverse[pos];
          let target = defense[defenseReverse[pos]];
          defenseDamage[idx] += troop.attack;
          if (target.hp - defenseDamage[idx] <= 0) {
            defenseMap -= 1 << pos;
            defendersDestroyed++;
            defendersSurvived--;
          }
          break;
        }
      }
    }


    let invadersDestroyed = 0;
    for (let i = 0; i < defense.length; i++) {
      let troop = defense[i];
      // skip dead
      if (troop.hp == 0) {
        continue;
      }
      let pos = troop.pos;
      let min = pos - troop.range;
      for (pos = pos + troop.range; pos >= min; pos--) {
        // starts big, most advanced troops
        if ((invasionMap & (1 << pos)) != 0) {
          // hit
          let idx = invasionReverse[pos];
          let target = invasion[invasionReverse[pos]];
          invasionDamage[idx] += troop.attack;
          if (target.hp - invasionDamage[idx] <= 0) {
            invasionMap -= 1 << pos;
            invadersDestroyed++;
            invadersSurvived--;
          }
          break;
        }
      }
    }


    // TODO draw attack then move and re-draw


    // update damaged defenders
    let newDefense = [];
    for (let i = 0; i < defense.length; i++) {
      let troop = defense[i];
      let newTroop = {...troop};
      newTroop.hp -= defenseDamage[i];
      // skip dead
      if (newTroop.hp <= 0) {
        continue;
      }
      newDefense.push(newTroop);
    }

    // move invaders - assume they are in order otherwise could break
    // TODO check if we need to reverse the order - default like 15 14 13 12 11..
    invasionMap = 0;
    let newInvasion = [];
    for (let i = 0; i < invasion.length; i++) {
      let troop = invasion[i];
      let newTroop = {...troop};
      newTroop.hp -= invasionDamage[i];
      // skip dead
      if (newTroop.hp <= 0) {
        continue;
      }
      // if (troop.hp == 0) { continue; }
      let pos = troop.pos;
      for (let speed = troop.speed; speed > 0; speed--) {
        pos++;
        if ((invasionMap & (1 << pos)) != 0) {
          pos--;
          break;
        }
      }
      invasionMap |= (1 << pos);
      // troop.pos = pos; // make sure this is where to update
      newTroop.pos = pos;
      newInvasion.push(newTroop);
    }

    
    setDefense(newDefense);
    setInvasion(newInvasion);

    
    draw();
  }

  return (
    <div>
      <div>from [ {defenseAry.map(n => '0x' + n.toString(16)).join([', '])} ]</div>
      <div>defense [ {!defense ? '...' : defense.map(troop => JSON.stringify(troop)).join([', ']).replaceAll('"', '')} ]</div>
      <div>invasion [ {!invasion ? '...' : invasion.map(troop => JSON.stringify(troop)).join([', ']).replaceAll('"', '')} ]</div>
      <div>invasion [ {invasionAry.map(n => '0x' + n.toString(16)).join([', '])} ]</div>
      <div>
        <Button onClick={move} >Make Move 1x</Button>
      </div>
    </div>
  );
}



function YourActiveMatches({
  changeMatchId,
  tx,
  address,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {
  const yours = useContractReader(readContracts, "Convoy", "yourNewestActiveMatches", [address]);
  console.log(yours);
  const requestChangeMatchId = (matchId) => {
    // set global matchId to this
    changeMatchId(matchId);
    console.log('play ', matchId);
  };
  return (
    <div>
      <h2>Your Active Matches ({yours ? yours.length : '...'})</h2>
      <List dataSource={yours} renderItem={item => (
        <List.Item actions={[<a key="join" onClick={(e) => requestChangeMatchId(item.toNumber(), e)} >play</a>]} >
          <div>matchId: <span>{item.toString()}</span></div>
          <div><a>get details</a></div>
        </List.Item>
      )} />
    </div>
  );
}


function Joinables({
  tx,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {
  const joinables = useContractReader(readContracts, "Convoy", "joinlist");
  console.log(joinables);
  if (!joinables) {
    return '';
  }
  const requestJoin = (matchId) => {
    tx(writeContracts.Convoy.joinMatch(matchId, false));
    console.log('join ', matchId);
  };
  return (
    <div>
      <h2>Joinable Matches ({joinables.length})</h2>
      <List dataSource={joinables} renderItem={item => (
        <List.Item actions={[<a key="join" onClick={(e) => requestJoin(item.toNumber(), e)} >join</a>]} >
          <div>matchId: <span>{item.toString()}</span></div>
          <div><a>get details</a></div>
        </List.Item>
      )} />
    </div>
  );
}

function InitMatch({
  tx,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {

  return (
      <div style={{ margin: 8 }}>
        <Button type='primary' 
          onClick={() => {
            tx(writeContracts.Convoy.initMatch());
          }}
        > Start a new match as defender </Button>
      </div>
  );

}

const MAX_ARMY = 5; // uint256, bytes32 can support up to 8 x 32bit troops
const OFF_POSITION = 16; // 5 bits but defense must be > 16, invader must start < 16
const OFF_TYPE = 13;
const OFF_HP = 10;
const OFF_RANGE = 7;
const OFF_ATTACK = 4;
const OFF_SPEED = 1;
const TYP_JAV = 1;
const TYP_RPG = 2;
const TYP_TANK = 3;
const TYP_BUS = 4;
const jav = {'hp': 2, 'range': 2, 'attack': 1};
const defStats = {2: {/* TODO */}};
defStats[TYP_JAV] = jav;
const invStats = {};
invStats[TYP_TANK] = { 'hp': 2, 'range': 1, 'attack': 2, 'speed': 1 };
invStats[TYP_BUS] = { 'hp': 1, 'range': 1, 'attack': 1, 'speed': 2 };
// const typeMap = {'Javelin': 0x01, 'RPG': 0x02};


function Match({
  matchId,
  address,
  tx,
  mainnetProvider,
  readContracts,
  writeContracts,
}) {
  //const match = useContractReader(readContracts, "Convoy", "getMatch", [matchId]);
  const [match, setMatch] = useState();
  useEffect(async () => {
    console.log(readContracts);
    if (!readContracts || readContracts.Convoy == undefined) return;
    //match = useContractReader(readContracts, "Convoy", "getMatch", [matchId]);
    //let _match = tx(readContracts.Convoy.getMatch(matchId));
    let _match = await readContracts.Convoy.getMatch(matchId);
    console.log(_match);
    setMatch(_match);
  }, [matchId]);
  useEffect(async () => {
    recalcInvasionHash();
  }, []);
  const [defenseAry, setDefenseAry] = useState([]);
  const [defenseHashContract, setDefenseHashContract] = useState();
  const [defenseHashComputed, setDefenseHashComputed] = useState();
  const [defenseTypes, setDefenseTypes] = useState(Array(MAX_ARMY).fill(TYP_JAV));
  const [defensePos, setDefensePos] = useState([]); // TODO init with MAX_POS=0x100
  const [invasionAry, setInvasionAry] = useState([]);
  const [invasionHashContract, setInvasionHashContract] = useState();
  const [invasionHashComputed, setInvasionHashComputed] = useState();
  const [invasionTypes, setInvasionTypes] = useState(Array(MAX_ARMY).fill(TYP_TANK));
  const [invasionPos, setInvasionPos] = useState([0x0F, 0x0E, 0x0D, 0x0C, 0x0B]);
  const [round, setRound] = useState(0);
  const _canvasPlan = document.getElementById("planCanvas");
  const _canvasPlay = document.getElementById("playCanvas");
  const _ctxPlan = _canvasPlan ? _canvasPlan.getContext("2d") : null;
  const _ctxPlay = _canvasPlay ? _canvasPlay.getContext("2d") : null;
  if (!match) return '';
  console.log(match);

  /*
  if (matchId != match.matchId.toNumber()) {
    setMatchId(match.matchId.toNumber());
    console.log('set new matchId ', matchId);
  }
  */
  if (defenseHashContract != match.defenseHash) {
    setDefenseHashContract(match.defenseHash);
    console.log('update defenseHashContract ', match.defenseHash);
  }
  if (invasionHashContract != match.invasionHash) {
    setInvasionHashContract(match.invasionHash);
    console.log('update invasionHashContract ', match.invasionHash);
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
  function makeDefenseTroop(pos, type, hp, range, attack) {
    return (pos << OFF_POSITION) + (type << OFF_TYPE) + (hp << OFF_HP) + (range << OFF_RANGE) + (attack << OFF_ATTACK);
  }
  // TODO invaders are ordered, not positioned
  function makeInvasionTroop(pos, type, hp, range, attack, speed) {
    return (pos << OFF_POSITION) + (type << OFF_TYPE) + (hp << OFF_HP) + (range << OFF_RANGE) + (attack << OFF_ATTACK) + (speed << OFF_SPEED);
  }
  function recalcDefenseHash() {
    let defense = [];
    for (let i = 0; i < defenseTypes.length; i++) {
      let typ = defenseTypes[i];
      defense.push(makeDefenseTroop(defensePos[i], typ, defStats[typ].hp, defStats[typ].range, defStats[typ].attack));
    }
    console.log(defense);
    let newHash = utils.keccak256(makeBytes32like(defense));
    console.log("defense and calc of defense", defense, newHash);
    setDefenseAry(defense);
    setDefenseHashComputed(newHash);
  }
  function recalcInvasionHash() {
    let invasion = [];
    for (let i = 0; i < invasionTypes.length; i++) {
      let typ = invasionTypes[i];
      invasion.push(makeInvasionTroop(invasionPos[i], typ, invStats[typ].hp, invStats[typ].range, invStats[typ].attack, invStats[typ].speed));
    }
    console.log(invasion);
    let newHash = utils.keccak256(makeBytes32like(invasion));
    console.log("invasion and calc of invasion", invasion, newHash);
    setInvasionAry(invasion);
    setInvasionHashComputed(newHash);
  }
  function changeDefenseType(troopIdx, val) {
    const newDefenseTypes = [...defenseTypes];
    newDefenseTypes[troopIdx] = val;
    setDefenseTypes(newDefenseTypes);
    recalcDefenseHash();
  }
  function changeInvasionType(troopIdx, val) {
    const newInvasionTypes = [...defenseTypes];
    newInvasionTypes[troopIdx] = val;
    setInvasionTypes(newInvasionTypes);
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

      {[0, 1, 2, 3, MAX_ARMY-1].map(n => { return (
        <Row key={'defender-' + n}>
          <Col span={6}>
            <Select defaultValue="1" onChange={(v) => changeDefenseType(n, v)}>
              <Option value="1">Javelin</Option>
              <Option value="2">RPG TODO</Option>
            </Select>
          </Col>
          <Col span={12}>
            <Slider min={16} max={31} onChange={(pos) => changeDefenseSlider(n, pos)} value={defensePos[n]} />
          </Col>
          <Col span={4}>
            <InputNumber min={16} max={31} style={{ margin: '0 16px' }} value={defensePos[n]} />
          </Col>
        </Row>
      )})}
      <div style={{ margin: 8 }}>
        <Button type='primary'
          onClick={() => {
            tx(writeContracts.Convoy.commit(matchId, true, defenseHashComputed));
          }}
        > Commit Defense Strategy (Hashed) to Blockchain </Button>
      </div>
      <div style={{ margin: 8 }}>
        <Button type='primary'
          onClick={() => {
            tx(writeContracts.Convoy.reveal(matchId, true, defenseAry));
          }}
        > Reveal Defense Strategy </Button>
      </div>

      <h1>Invasion</h1>

      <Row >
      {[0, 1, 2, 3, MAX_ARMY-1].map(n => { return (
        <Col key={'invader-' + n} span={4}>
          <Select defaultValue={TYP_TANK} onChange={(v) => changeDefenseType(n, v)}>
            <Option value={TYP_TANK}>Tank</Option>
            <Option value={TYP_BUS}>Personnel Carrier</Option>
          </Select>
        </Col>
      )})}
      </Row>
      <div>{match.defenderRevealed || match.invaderRevealed ? 'waiting for reveals' : 'ready to (re)commit'}</div>
      <div>invader hash from contract: {invasionHashContract == 0 ? '...waiting to commit' : invasionHashContract}</div>
      <div>invader hash strat computed: {invasionHashComputed == 0 ? '...' : invasionHashComputed}</div>
      <div><span style={{color:'green'}}>{invasionHashContract == invasionHashComputed ? 'match' : ''}</span></div>
      <div>from [ {invasionAry.map(n => '0x' + n.toString(16)).join([', '])} ]</div>

      <div>
        <h1>Plan</h1>
        <canvas id="planCanvas" width="720" height="200" style={{border:'1px solid black'}}></canvas>
        {_ctxPlan ? (<Board
            mode='plan'
            canvas={_canvasPlan} ctx={_ctxPlan}
            defenseAry={defenseAry}
            invasionAry={invasionAry}
          />
        ): ''}
        <h1>Play</h1>
        <canvas id="playCanvas" width="720" height="200" style={{border:'1px solid black'}}></canvas>
        {_ctxPlan ? (<Board
            mode='play'
            canvas={_canvasPlay} ctx={_ctxPlay}
            defenseAry={defenseAry}
            invasionAry={invasionAry}
          />
        ): ''}
      </div>
    </div>
  );
}

export default function Game({
  address,
  mainnetProvider,
  localProvider,
  yourLocalBalance,
  tx,
  readContracts,
  writeContracts,
}) {
  const [matchId, setMatchId] = useState(null);

  return (
    <div>
      {/*
        ⚙️ Here is an example UI that displays and sets the purpose in your smart contract:
      */}
      <div style={{ border: "1px solid #cccccc", padding: 16, width: 800, margin: "auto", marginTop: 64 }}>
        <h2>Convoy Game UI:</h2>

        <InitMatch readContracts={readContracts}
          tx={tx}
          mainnetProvider={mainnetProvider}
          writeContracts={writeContracts}
        />
        <Collapse defaultActiveKey={['2']} >
          <Panel header="Joinable Matches" key="1">
            <Joinables readContracts={readContracts}
              tx={tx}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          </Panel>
        </Collapse>
        <Collapse defaultActiveKey={['2']} >
          <Panel header="Your Matches" key="2">
            <YourActiveMatches readContracts={readContracts}
              changeMatchId={setMatchId}
              tx={tx}
              address={address}
              writeContracts={writeContracts}
              mainnetProvider={mainnetProvider}
            />
          </Panel>
        </Collapse>
        <Divider />
    <h1> Game Match {matchId} </h1>
        {readContracts ? 
          <Match
            matchId={matchId}
            tx={tx}
            readContracts={readContracts}
            address={address}
            mainnetProvider={mainnetProvider}
            writeContracts={writeContracts}
          />
          : ''}

      </div>

      {/*
        📑 Maybe display a list of events?
          (uncomment the event and emit line in YourContract.sol! )
  event MatchMinted(uint256 indexed matchId);
  event MatchJoined(uint256 indexed matchId, address opponent);
  event Committed(uint256 indexed matchId, bool asDefender);
  event Revealed(uint256 indexed matchId, bool asDefender);
  event InvadersDestroyed(uint256 indexed matchId, uint8 count);
  event DefendersDestroyed(uint256 indexed matchId, uint8 count);
          
      */}
      <div>
        <Events
          contracts={readContracts}
          contractName="Convoy"
          eventName="MatchMinted"
          localProvider={localProvider}
          mainnetProvider={mainnetProvider}
          startBlock={1}
        />
        <Events
          contracts={readContracts}
          contractName="Convoy"
          eventName="MatchJoined"
          localProvider={localProvider}
          mainnetProvider={mainnetProvider}
          startBlock={1}
        />
      </div>

    </div>
  );
}
