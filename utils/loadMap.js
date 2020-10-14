const MAP = require('../data/maps.json')

const loadMap = (name = 'classic') => {
    const json = MAP[name]
    const result = Array(10).fill(Array(10).fill(0))
        .map((arr, y) => arr.map((_, x) => {
            return(  
                json[`${x}${y}`] ? { x, y, cellState: json[`${x}${y}`] }
            :   /**else */       { x, y, cellState: 'empty' })
        })).flat()
        
    return result
}

const randomMap = () => {
    const keys = Object.keys(MAP)
    const n = Math.floor(Math.random() * keys.length)
    let result = MAP.mapA
    keys.forEach((map, i) => result = i === n ? map : result)
}

module.exports = loadMap