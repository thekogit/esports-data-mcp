const { spawn } = require('child_process');

async function testServer(serverScript, toolName, args = {}) {
  return new Promise((resolve, reject) => {
    const cp = spawn('node', [serverScript]);
    
    let output = '';
    cp.stdout.on('data', (data) => {
      const msgs = data.toString().split('\n').filter(Boolean);
      for (const msg of msgs) {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.id === 1) { // init response
            cp.stdin.write(JSON.stringify({
              jsonrpc: "2.0",
              id: 2,
              method: "tools/call",
              params: { name: toolName, arguments: args }
            }) + '\n');
          } else if (parsed.id === 2) { // tool response
            cp.kill();
            resolve(parsed.result || parsed.error);
          }
        } catch (e) {}
      }
    });

    cp.stderr.on('data', (data) => {
      // console.error(`[${serverScript}]`, data.toString());
    });

    // Send init
    cp.stdin.write(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
    }) + '\n');

    setTimeout(() => {
      cp.kill();
      reject(new Error("Timeout"));
    }, 5000);
  });
}

async function runTests() {
  console.log("Testing CS2 Server...");
  try {
    const cs2 = await testServer('dist/cs2.js', 'get_cs2_team_rankings');
    console.log("CS2 Team Rankings Success:", !!cs2.content);
  } catch (e) { console.log("CS2 Error:", e.message); }

  console.log("\nTesting Dota 2 Server...");
  try {
    const dota = await testServer('dist/dota2.js', 'get_dota2_live_matches');
    console.log("Dota 2 Live Matches Success:", !!dota.content);
  } catch (e) { console.log("Dota 2 Error:", e.message); }

  console.log("\nTesting LoL Server...");
  try {
    const lol = await testServer('dist/lol.js', 'get_lol_tournaments');
    console.log("LoL Tournaments Success:", !!lol.content);
  } catch (e) { console.log("LoL Error:", e.message); }

  console.log("\nTesting Valorant Server...");
  try {
    const valo = await testServer('dist/valo.js', 'get_valo_events', { status: 'ongoing' });
    console.log("Valorant Events Success:", !!valo.content);
  } catch (e) { console.log("Valorant Error:", e.message); }
}

runTests();
