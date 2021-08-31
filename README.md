# cert-lib

基于井通链的存证验真开发包

## Usage

```javascript
import JccCert from "@jccdex/cert-lib";

const rpcNodes = await JccCert.fetchNodes();
const jccCert = new JccCert({
  senderSecret: "Your Secret",
  receiverAddress: "Jingtum Address",
  nodes: rpcNodes,
  amount: "Amount Value",
  token: "Token Name",
  chain: "Chain Name"
});

// hash上链存证
const hashCert = await jccCert.saveHashCert("a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3");
console.log("saved hash cert: ", hashCert);

// buffer上链存证
const bufferCert = await jccCert.saveBufferCert(Buffer.from("test", "utf-8"));
console.log("saved buffer cert: ", bufferCert);

// 校验存证hash
const isValid = await jccCert.checkCert(bufferCert.cid, bufferCert.txHash);
console.log("cert is valid: ", isValid);
```
