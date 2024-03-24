


module.exports = {

    chunk: function(array, chunk_size) {
        return array.reduce((acc, one, index) => {
            const section = Math.floor(index/chunk_size)
            acc[section] = [].concat((acc[section] || []), one)
            return acc
        }, [])
    }
}