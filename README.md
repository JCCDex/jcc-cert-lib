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
  token: "Token Name"
});

const content = Buffer.from("test", "utf-8");

const cert = await jccCert.saveCert(content);

console.log("saved cert: ", cert);

const isValid = await jccCert.checkCert(cert.cid, cert.txHash);

console.log("cert is valid: ", isValid);
```
