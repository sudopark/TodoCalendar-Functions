// 최소 힙. occurrence 후보를 시각순으로 뽑는 k-way merge에 쓴다.
// 비교 함수 isLess(a, b)는 a가 b보다 "먼저" 나와야 하면 true.
class MinHeap {
    constructor(isLess) {
        this._items = []
        this._isLess = isLess
    }

    get size() {
        return this._items.length
    }

    push(item) {
        const items = this._items
        items.push(item)
        this._siftUp(items.length - 1)
    }

    // 루트(가장 먼저 나올 항목) 제거 후 반환.
    pop() {
        const items = this._items
        const top = items[0]
        const last = items.pop()
        if (items.length > 0) {
            items[0] = last
            this._siftDown(0)
        }
        return top
    }

    _siftUp(index) {
        const items = this._items
        while (index > 0) {
            const parent = (index - 1) >> 1
            if (!this._isLess(items[index], items[parent])) break
            this._swap(index, parent)
            index = parent
        }
    }

    _siftDown(index) {
        const items = this._items
        for (;;) {
            const left = 2 * index + 1
            const right = left + 1
            let smallest = index
            if (left < items.length && this._isLess(items[left], items[smallest])) smallest = left
            if (right < items.length && this._isLess(items[right], items[smallest])) smallest = right
            if (smallest === index) break
            this._swap(index, smallest)
            index = smallest
        }
    }

    _swap(a, b) {
        const items = this._items
        const tmp = items[a]
        items[a] = items[b]
        items[b] = tmp
    }
}

module.exports = { MinHeap }
