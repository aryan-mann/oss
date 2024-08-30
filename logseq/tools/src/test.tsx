import React from 'react';

export default function Test() {
    const [count, setCount] = React.useState(0);

    return (
        <div>
            {count}
            <button onClick={() => { setCount(p => p+1); }}>Pres</button>
        </div>
    )
}