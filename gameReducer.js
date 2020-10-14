const {isAdjacent, isJumpable} = require('./utils/gridHelpers')

//game cell states
const BACT          = 'bacteria',
      CELL          = 'cell',
      EMPTY         = 'empty',
      INVIS         = 'invisible'


//action types
const BACT_DIV      = 'Bacteria Divide',
      CELL_DIV      = 'Cell Divide',
      BACT_JUMP     = 'Bacteria Jump',
      CELL_JUMP     = 'Cell Jump',
      CELL_SELECT   = 'Cell Select',
      BACT_SELECT   = 'Bacteria Select',
      CELL_DESELECT = 'Cell Deselect',
      BACT_DESELECT = 'Bacteria Deselect'

//HELPERS

const stateToBin = state => 
    state === CELL ? 0
:   state === BACT ? 1
:   /**else */       err(`[stateToBin]: expected '${CELL}' or '${BACT}', got '${state}'.`)

const getOpp = state =>
    state === CELL ? BACT
:   state === BACT ? CELL
:   /**else */       err(`[getOpp]: expected '${CELL}' or '${BACT}', got '${state}'.`)

const err = e => { throw new Error(e) }

const runAdjacents = (which, next, pos) => {
    const adjacents = next.filter(cell => isAdjacent(pos, cell))
    const opposite = getOpp(which)

    adjacents.forEach(c1 => {
        //ref to instance in next
        const maybe_change = next.find(c2 => c1.x === c2.x && c1.y === c2.y)
        if(maybe_change) {
            maybe_change.cellState =
                maybe_change.cellState === which        ? which
            :   maybe_change.cellState === EMPTY        ? EMPTY
            :   maybe_change.cellState === INVIS        ? INVIS 
            :   maybe_change.cellState === opposite     ? which
            :   /**else */                                err(`[runAdjacents]: unexpected cellState value: ${maybe_change.cellState}`)
        }
    })

    return next
}

//REDUCING

const reduceDiv = which => (state, pos) => {
    const activeState = state.game[stateToBin(which)]
    const opposite = getOpp(which)
    console.log('what is opposite? ' + opposite)
    const target = activeState.cells.find(c => c.x === pos.x && c.y === pos.y)
    target.cellState = 
        which === BACT ? BACT 
    :   which === CELL ? CELL
    :   /**else*/        err(`in reduceDiv, expected <state> of '${CELL}' or '${BACT}', got '${which}'.`)

    runAdjacents(which, activeState.cells, target)

    const newGame = { 
        ...activeState,
        cells: activeState.cells,
        turn: opposite, 
        selected: null, 
        divs: [], 
        jumps: [], 
        runningMove: false 
    }

    const newOpp = { 
        ...newGame, 
        turn: opposite, 
        cells: activeState.cells, 
        socketID: state.game[stateToBin(opposite)].socketID, 
        team: opposite 
    }

    const newState = []
    newState[stateToBin(which)] = newGame
    newState[stateToBin(opposite)] = newOpp

    return {...state, game: newState }
}

const reduceBactDiv = reduceDiv(BACT)
const reduceCellDiv = reduceDiv(CELL)

const reduceJump = which => (state, pos) => {
    const activeState = state.game[stateToBin(which)]
    const nextCells = runAdjacents(which, activeState.cells, pos)
    const opposite = getOpp(which)
    const prevCell = nextCells.find(c => c.x === activeState.selected.x 
                                      && c.y === activeState.selected.y)
    const target = nextCells.find(c => c.x === pos.x && c.y === pos.y)
    prevCell.cellState = EMPTY
    target.cellState = which 

    const newGame = { 
        ...activeState, 
        cells: nextCells, 
        turn: opposite, 
        selected: null, 
        divs: [], 
        jumps: [], 
        runningMove: false 
    }

    const newOpp = { ...newGame, turn: opposite, cells: nextCells, socketID: state.game[stateToBin(opposite)].socketID, team: opposite }

    const newState = []
    newState[stateToBin(which)] = newGame
    newState[stateToBin(opposite)] = newOpp

    return {...state, game: newState }
}

const reduceBactJump = reduceJump(BACT)
const reduceCellJump = reduceJump(CELL)

const reduceSelect = which => (state, pos) => {

    console.log(state)

    const opposite = getOpp(which)
    const last = state.game[stateToBin(which)]
    const cell = last.cells.find(c => c.x === pos.x && c.y === pos.y && c.cellState === which)
    const divs = last.cells.filter(c2 => isAdjacent(cell, c2) && c2.cellState === EMPTY)
    const jumps = last.cells.filter(c2 => isJumpable(cell, c2) && c2.cellState === EMPTY)
    
    const newGame = { 
        ...last,
        selected: cell,
        runningMove: cell !== null, 
        jumps: jumps, 
        divs: divs
    }
    const newOpp = state.game[stateToBin(opposite)]

    const newState = []
    newState[stateToBin(which)] = newGame
    newState[stateToBin(opposite)] = newOpp

    return { ...state, game: newState }
}

const reduceBactSelect = reduceSelect(BACT)
const reduceCellSelect = reduceSelect(CELL)

const reduceDeselect = which => (state) => {
    const host = state.game[0]
    const client = state.game[1]
    const opposite = getOpp(which)
    const actor = which === 'cell' ? host : client
    const other = which === 'cell' ? client : host

    const next = { ...actor, selected: null, runningMove: false, jumps: [], divs: [] }
    const newOpp = { ...other }

    const newState = []
    newState[stateToBin(which)] = next
    newState[stateToBin(opposite)] = newOpp

    return { ...state, game: newState }
}

const reduceCellDeselect = reduceDeselect(CELL)
const reduceBactDeselect = reduceDeselect(BACT)

const reducer = (state, [kind, data]) => 
        kind === BACT_DIV       ? reduceBactDiv(state, data)
    :   kind === CELL_DIV       ? reduceCellDiv(state, data)
    :   kind === BACT_JUMP      ? reduceBactJump(state, data)
    :   kind === CELL_JUMP      ? reduceCellJump(state, data)
    :   kind === BACT_SELECT    ? reduceBactSelect(state, data)
    :   kind === CELL_SELECT    ? reduceCellSelect(state, data)
    :   kind === CELL_DESELECT  ? reduceCellDeselect(state)
    :   kind === BACT_DESELECT  ? reduceBactDeselect(state)
    :   /**else*/                 state




module.exports = reducer