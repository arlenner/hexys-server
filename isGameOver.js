const {isAdjacent, isJumpable} = require('./utils/gridHelpers') 

const noop = () => {}

const isValidMove = (c1, c2) => c1.cellState === 'empty' && (isAdjacent(c1, c2) || isJumpable(c1, c2))

//GameState -> Boolean
const checkIsGameOver = (io, state) => {
    const { cells } = state.game[0]
    const host = state.game[0].socketID,
          client = state.game[1].socketID

    const cellArr = cells.filter(c => c.cellState === 'cell'),
          bactArr = cells.filter(c => c.cellState === 'bacteria'),
          empties = cells.filter(c => c.cellState === 'empty')

    if(cellArr.length === 0) {
        io.to(host).to(client).emit('bact-victory', state)
        return true
    }

    if(bactArr.length === 0) {
        io.to(host)
          .to(client)
          .emit('cell-victory', state)
        return true
    }

    if(empties.length === 0) {
        return (
            cellArr.length > bactArr.length     ? (io.to(host).to(client).emit('cell-victory', state), true)
        :   bactArr.length > cellArr.length     ? (io.to(host).to(client).emit('bact-victory', state), true)
        :   cellArr.length === bactArr.length   ? (io.to(host).to(client).emit('tie-game', state), true)
        :   /**else*/                             false
        )
    }

    //containment victory
    const movesPair = (() => {
        const result = [[], []]
        cells.forEach(c => {
            for(const c2 of cellArr) {
                isValidMove(c, c2) ? result[0].push(c2)
            : /** else */            noop()
            }
            for(const c3 of bactArr) {
                isValidMove(c, c3)  ? result[1].push(c3)
            :   /** else */           noop()
            }
        })
        return result
    })()
    
    return (
        movesPair[0].length === 0 
        && state.turn === 'cell'        ? (io.to(host).to(client).emit('bact-victory', state), true)
    :   movesPair[1].length === 0
        && state.turn === 'bacteria'    ? (io.to(host).to(client).emit('cell-victory', state), true)
    :   /**else */                        false
    )
}

module.exports = checkIsGameOver
