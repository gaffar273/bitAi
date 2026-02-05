async function test() {
    try {
        console.log('Testing Workflow with userWallet...');
        const res = await fetch('http://localhost:5000/api/orchestrator/workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                orchestratorWallet: "0xOrchestrator",
                steps: [{ serviceType: "summarizer", input: { text: "hello" } }],
                userWallet: "0xTestUser123"
            })
        });
        const data = await res.json();
        console.log('Success:', data.success);

        console.log('Checking channels for user 0xTestUser123...');
        const res2 = await fetch('http://localhost:5000/api/wallet/0xTestUser123/channels');
        const data2 = await res2.json();
        console.log('Channels found:', data2.data.count);
        console.log(JSON.stringify(data2.data.channels, null, 2));
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
