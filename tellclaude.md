PS C:\Users\BabsBuild\SHIELD\frontend> 
                                       npm audit fix --force
npm warn using --force Recommended protections disabled.
npm warn audit Updating eslint to 10.0.1, which is a SemVer major change.
npm warn audit Updating @eslint/eslintrc to 0.1.0, which is a SemVer major change.
npm warn audit Updating eslint-plugin-react to 7.22.0, which is a SemVer major change.
npm warn audit Updating @next/eslint-plugin-next to 16.1.6, which is a SemVer major change.       
npm warn audit Updating eslint-config-next to 0.2.4, which is a SemVer major change.
npm warn audit Updating typescript-eslint to 8.36.0, which is a SemVer major change.
npm warn audit Updating @typescript-eslint/parser to 6.15.0, which is a SemVer major change.      
npm warn audit Updating @web3modal/wagmi to 5.0.11, which is a SemVer major change.
npm warn audit Updating @typescript-eslint/eslint-plugin to 6.15.0, which is a SemVer major change.
npm warn audit Updating @lit-protocol/constants to 8.0.0, which is a SemVer major change.
npm warn deprecated @web3modal/siwe@5.0.11: Web3Modal is now Reown AppKit. Please follow the upgrade guide at https://docs.reown.com/appkit/upgrade/from-w3m-to-reown
npm warn deprecated @web3modal/wagmi@5.0.11: Web3Modal is now Reown AppKit. Please follow the upgrade guide at https://docs.reown.com/appkit/upgrade/from-w3m-to-reown
npm warn deprecated @walletconnect/ethereum-provider@2.14.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/sign-client@2.14.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @walletconnect/universal-provider@2.14.0: Reliability and performance improvements. See: https://github.com/WalletConnect/walletconnect-monorepo/releases
npm warn deprecated @web3modal/core@5.0.11: Web3Modal is now Reown AppKit. Please follow the upgrade guide at https://docs.reown.com/appkit/upgrade/from-w3m-to-reown
npm warn deprecated @web3modal/ui@5.0.11: Web3Modal is now Reown AppKit. Please follow the upgrade guide at https://docs.reown.com/appkit/upgrade/from-w3m-to-reown

added 86 packages, removed 206 packages, changed 98 packages, and audited 1517 packages in 5m     

305 packages are looking for funding
  run `npm fund` for details

# npm audit report

@coinbase/wallet-sdk  4.0.0-beta.0 - 4.2.4
Severity: high
Unknown vulnerability in Coinbase Wallet SDK - https://github.com/advisories/GHSA-8rgj-285w-qcq4  
fix available via `npm audit fix --force`
Will install @web3modal/wagmi@5.1.11, which is outside the stated dependency range
node_modules/@web3modal/scaffold-utils/node_modules/@coinbase/wallet-sdk
  @web3modal/scaffold-utils  5.0.8 - 5.1.2
  Depends on vulnerable versions of @coinbase/wallet-sdk
  node_modules/@web3modal/scaffold-utils
    @web3modal/scaffold  >=5.0.8
    Depends on vulnerable versions of @web3modal/scaffold-ui
    Depends on vulnerable versions of @web3modal/scaffold-utils
    Depends on vulnerable versions of @web3modal/siwe
    node_modules/@web3modal/scaffold
      @web3modal/scaffold-react  >=5.0.8
      Depends on vulnerable versions of @web3modal/scaffold
      node_modules/@web3modal/scaffold-react
      @web3modal/scaffold-vue  >=5.0.8
      Depends on vulnerable versions of @web3modal/scaffold
      node_modules/@web3modal/scaffold-vue
      @web3modal/wagmi  3.6.0-021a4b4 - 4.0.0-544a28f1 || 5.0.8 - 5.1.2
      Depends on vulnerable versions of @web3modal/scaffold
      Depends on vulnerable versions of @web3modal/scaffold-react
      Depends on vulnerable versions of @web3modal/scaffold-utils
      Depends on vulnerable versions of @web3modal/scaffold-vue
      Depends on vulnerable versions of @web3modal/siwe
      node_modules/@web3modal/wagmi
    @web3modal/scaffold-ui  5.0.8 - 5.1.2
    Depends on vulnerable versions of @web3modal/scaffold-utils
    Depends on vulnerable versions of @web3modal/siwe
    node_modules/@web3modal/scaffold-ui
    @web3modal/siwe  5.0.8 - 5.1.2
    Depends on vulnerable versions of @web3modal/scaffold-utils
    node_modules/@web3modal/siwe

bn.js  <5.2.3
Severity: moderate
bn.js affected by an infinite loop - https://github.com/advisories/GHSA-378v-28hj-76wf
fix available via `npm audit fix`
node_modules/elliptic/node_modules/bn.js
  elliptic  *
  Depends on vulnerable versions of bn.js
  node_modules/elliptic
    @ethersproject/signing-key  <=5.8.0
    Depends on vulnerable versions of elliptic
    node_modules/@ethersproject/signing-key
      @ethersproject/hdnode  *
      Depends on vulnerable versions of @ethersproject/abstract-signer
      Depends on vulnerable versions of @ethersproject/signing-key
      Depends on vulnerable versions of @ethersproject/transactions
      Depends on vulnerable versions of @ethersproject/wordlists
      node_modules/@ethersproject/hdnode
      @ethersproject/transactions  <=5.8.0
      Depends on vulnerable versions of @ethersproject/signing-key
      node_modules/@ethersproject/abstract-signer/node_modules/@ethersproject/transactions        
      node_modules/@ethersproject/hdnode/node_modules/@ethersproject/transactions
      node_modules/@ethersproject/json-wallets/node_modules/@ethersproject/transactions
      node_modules/@ethersproject/transactions
      node_modules/ethers/node_modules/@ethersproject/transactions
        @ethersproject/abstract-provider  *
        Depends on vulnerable versions of @ethersproject/transactions
        node_modules/@ethersproject/abstract-provider
        node_modules/@ethersproject/abstract-signer/node_modules/@ethersproject/abstract-provider 
        node_modules/ethers/node_modules/@ethersproject/abstract-provider
          @ethersproject/abstract-signer  *
          Depends on vulnerable versions of @ethersproject/abstract-provider
          node_modules/@ethersproject/abstract-signer
            @ethersproject/hash  5.0.6 - 5.8.0
            Depends on vulnerable versions of @ethersproject/abstract-signer
            node_modules/@ethersproject/hash
              @ethersproject/abi  5.0.10 - 5.8.0
              Depends on vulnerable versions of @ethersproject/hash
              node_modules/@ethersproject/abi
              node_modules/ethers/node_modules/@ethersproject/abi
                @ethersproject/contracts  *
                Depends on vulnerable versions of @ethersproject/abi
                Depends on vulnerable versions of @ethersproject/abstract-provider
                Depends on vulnerable versions of @ethersproject/abstract-signer
                Depends on vulnerable versions of @ethersproject/transactions
                node_modules/@ethersproject/contracts
                node_modules/ethers/node_modules/@ethersproject/contracts
                  ethers  5.0.0-beta.119 - 5.8.0
                  Depends on vulnerable versions of @ethersproject/abi
                  Depends on vulnerable versions of @ethersproject/abstract-provider
                  Depends on vulnerable versions of @ethersproject/abstract-signer
                  Depends on vulnerable versions of @ethersproject/contracts
                  Depends on vulnerable versions of @ethersproject/hash
                  Depends on vulnerable versions of @ethersproject/hdnode
                  Depends on vulnerable versions of @ethersproject/json-wallets
                  Depends on vulnerable versions of @ethersproject/providers
                  Depends on vulnerable versions of @ethersproject/signing-key
                  Depends on vulnerable versions of @ethersproject/transactions
                  Depends on vulnerable versions of @ethersproject/wallet
                  Depends on vulnerable versions of @ethersproject/wordlists
                  node_modules/ethers
                    @lit-protocol/access-control-conditions  *
                    Depends on vulnerable versions of @ethersproject/abstract-provider
                    Depends on vulnerable versions of @ethersproject/contracts
                    Depends on vulnerable versions of @ethersproject/providers
                    Depends on vulnerable versions of @lit-protocol/constants
                    Depends on vulnerable versions of @lit-protocol/logger
                    Depends on vulnerable versions of @lit-protocol/misc
                    Depends on vulnerable versions of @lit-protocol/types
                    Depends on vulnerable versions of @lit-protocol/uint8arrays
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/access-control-conditions
                      @lit-protocol/core  *
                      Depends on vulnerable versions of @ethersproject/abi
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @ethersproject/contracts
                      Depends on vulnerable versions of @ethersproject/providers
                      Depends on vulnerable versions of @lit-protocol/access-control-conditions   
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/contracts-sdk
                      Depends on vulnerable versions of @lit-protocol/crypto
                      Depends on vulnerable versions of @lit-protocol/logger
                      Depends on vulnerable versions of @lit-protocol/misc
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of @lit-protocol/uint8arrays
                      Depends on vulnerable versions of @lit-protocol/wasm
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/core
                        @lit-protocol/lit-node-client  *
                        Depends on vulnerable versions of @ethersproject/abi
                        Depends on vulnerable versions of @ethersproject/abstract-provider        
                        Depends on vulnerable versions of @ethersproject/contracts
                        Depends on vulnerable versions of @ethersproject/providers
                        Depends on vulnerable versions of @ethersproject/transactions
                        Depends on vulnerable versions of @ethersproject/wallet
                        Depends on vulnerable versions of @lit-protocol/access-control-conditions 
                        Depends on vulnerable versions of @lit-protocol/auth-browser
                        Depends on vulnerable versions of @lit-protocol/auth-helpers
                        Depends on vulnerable versions of @lit-protocol/constants
                        Depends on vulnerable versions of @lit-protocol/contracts-sdk
                        Depends on vulnerable versions of @lit-protocol/core
                        Depends on vulnerable versions of @lit-protocol/crypto
                        Depends on vulnerable versions of @lit-protocol/lit-node-client-nodejs    
                        Depends on vulnerable versions of @lit-protocol/logger
                        Depends on vulnerable versions of @lit-protocol/misc
                        Depends on vulnerable versions of @lit-protocol/misc-browser
                        Depends on vulnerable versions of @lit-protocol/types
                        Depends on vulnerable versions of @lit-protocol/uint8arrays
                        Depends on vulnerable versions of @lit-protocol/wasm
                        Depends on vulnerable versions of ethers
                        node_modules/@lit-protocol/lit-node-client
                    @lit-protocol/auth-browser  *
                    Depends on vulnerable versions of @ethersproject/abstract-provider
                    Depends on vulnerable versions of @ethersproject/contracts
                    Depends on vulnerable versions of @ethersproject/providers
                    Depends on vulnerable versions of @ethersproject/wallet
                    Depends on vulnerable versions of @lit-protocol/constants
                    Depends on vulnerable versions of @lit-protocol/logger
                    Depends on vulnerable versions of @lit-protocol/misc
                    Depends on vulnerable versions of @lit-protocol/misc-browser
                    Depends on vulnerable versions of @lit-protocol/types
                    Depends on vulnerable versions of @lit-protocol/uint8arrays
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/auth-browser
                    @lit-protocol/auth-helpers  <=0.0.0-20251031163033 || >=6.0.0-alpha.1
                    Depends on vulnerable versions of @ethersproject/abstract-provider
                    Depends on vulnerable versions of @ethersproject/contracts
                    Depends on vulnerable versions of @ethersproject/providers
                    Depends on vulnerable versions of @lit-protocol/access-control-conditions     
                    Depends on vulnerable versions of @lit-protocol/constants
                    Depends on vulnerable versions of @lit-protocol/logger
                    Depends on vulnerable versions of @lit-protocol/misc
                    Depends on vulnerable versions of @lit-protocol/types
                    Depends on vulnerable versions of @lit-protocol/uint8arrays
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/auth-helpers
                      @lit-protocol/lit-node-client-nodejs  *
                      Depends on vulnerable versions of @ethersproject/abi
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @ethersproject/contracts
                      Depends on vulnerable versions of @ethersproject/providers
                      Depends on vulnerable versions of @ethersproject/transactions
                      Depends on vulnerable versions of @lit-protocol/access-control-conditions   
                      Depends on vulnerable versions of @lit-protocol/auth-helpers
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/contracts-sdk
                      Depends on vulnerable versions of @lit-protocol/core
                      Depends on vulnerable versions of @lit-protocol/crypto
                      Depends on vulnerable versions of @lit-protocol/logger
                      Depends on vulnerable versions of @lit-protocol/misc
                      Depends on vulnerable versions of @lit-protocol/misc-browser
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of @lit-protocol/uint8arrays
                      Depends on vulnerable versions of @lit-protocol/wasm
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/lit-node-client-nodejs
                    @lit-protocol/constants  <=0.0.0-20251031163033 || 2.2.40 - 7.4.0 || >=8.0.1-test.0
                    Depends on vulnerable versions of @ethersproject/abstract-provider
                    Depends on vulnerable versions of @lit-protocol/types
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/access-control-conditions/node_modules/@lit-protocol/constants
                    node_modules/@lit-protocol/auth-browser/node_modules/@lit-protocol/constants  
                    node_modules/@lit-protocol/auth-helpers/node_modules/@lit-protocol/constants  
                    node_modules/@lit-protocol/contracts-sdk/node_modules/@lit-protocol/constants 
                    node_modules/@lit-protocol/core/node_modules/@lit-protocol/constants
                    node_modules/@lit-protocol/crypto/node_modules/@lit-protocol/constants        
                    node_modules/@lit-protocol/lit-node-client-nodejs/node_modules/@lit-protocol/constants
                    node_modules/@lit-protocol/lit-node-client/node_modules/@lit-protocol/constants
                    node_modules/@lit-protocol/logger/node_modules/@lit-protocol/constants        
                    node_modules/@lit-protocol/misc-browser/node_modules/@lit-protocol/constants  
                    node_modules/@lit-protocol/misc/node_modules/@lit-protocol/constants
                    node_modules/@lit-protocol/uint8arrays/node_modules/@lit-protocol/constants   
                      @lit-protocol/contracts-sdk  *
                      Depends on vulnerable versions of @ethersproject/abi
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @ethersproject/contracts
                      Depends on vulnerable versions of @ethersproject/providers
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/logger
                      Depends on vulnerable versions of @lit-protocol/misc
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/contracts-sdk
                      @lit-protocol/crypto  *
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @ethersproject/contracts
                      Depends on vulnerable versions of @ethersproject/providers
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/logger
                      Depends on vulnerable versions of @lit-protocol/misc
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of @lit-protocol/uint8arrays
                      Depends on vulnerable versions of @lit-protocol/wasm
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/crypto
                      @lit-protocol/logger  <=8.0.0-test.25
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/logger
                        @lit-protocol/misc  <=0.0.0-20251018025613 || 0.1.71 - 0.1.72 || 0.1.97 - 0.1.102 || 2.0.26 || 2.0.36 || 2.1.5 || >=2.2.0
                        Depends on vulnerable versions of @ethersproject/abstract-provider        
                        Depends on vulnerable versions of @ethersproject/contracts
                        Depends on vulnerable versions of @ethersproject/providers
                        Depends on vulnerable versions of @lit-protocol/constants
                        Depends on vulnerable versions of @lit-protocol/logger
                        Depends on vulnerable versions of @lit-protocol/types
                        Depends on vulnerable versions of ethers
                        node_modules/@lit-protocol/misc
                      @lit-protocol/misc-browser  <=0.0.0-20251018025613 || 0.1.75 || 2.0.19 || 2.0.25 || 2.0.28 || 2.0.30 - 7.4.0
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of @lit-protocol/uint8arrays
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/misc-browser
                      @lit-protocol/uint8arrays  <=0.0.0-20251018025613 || 3.2.2-dev.1 - 7.4.0    
                      Depends on vulnerable versions of @ethersproject/abstract-provider
                      Depends on vulnerable versions of @lit-protocol/constants
                      Depends on vulnerable versions of @lit-protocol/types
                      Depends on vulnerable versions of ethers
                      node_modules/@lit-protocol/uint8arrays
                    @lit-protocol/types  <=0.0.0-20251031163033 || >=2.2.40
                    Depends on vulnerable versions of @ethersproject/abstract-provider
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/types
                    @lit-protocol/wasm  <=7.2.1 || >=7.2.4-alpha.0
                    Depends on vulnerable versions of ethers
                    node_modules/@lit-protocol/wasm
              @ethersproject/providers  <=5.8.0
              Depends on vulnerable versions of @ethersproject/abstract-provider
              Depends on vulnerable versions of @ethersproject/abstract-signer
              Depends on vulnerable versions of @ethersproject/hash
              Depends on vulnerable versions of @ethersproject/transactions
              Depends on vulnerable versions of ws
              node_modules/@ethersproject/providers
              node_modules/ethers/node_modules/@ethersproject/providers
              @ethersproject/wallet  <=5.8.0
              Depends on vulnerable versions of @ethersproject/abstract-provider
              Depends on vulnerable versions of @ethersproject/abstract-signer
              Depends on vulnerable versions of @ethersproject/hash
              Depends on vulnerable versions of @ethersproject/hdnode
              Depends on vulnerable versions of @ethersproject/json-wallets
              Depends on vulnerable versions of @ethersproject/signing-key
              Depends on vulnerable versions of @ethersproject/transactions
              Depends on vulnerable versions of @ethersproject/wordlists
              node_modules/@ethersproject/wallet
              node_modules/ethers/node_modules/@ethersproject/wallet
              @ethersproject/wordlists  5.0.8 - 5.8.0
              Depends on vulnerable versions of @ethersproject/hash
              node_modules/@ethersproject/wordlists
        @ethersproject/json-wallets  *
        Depends on vulnerable versions of @ethersproject/abstract-signer
        Depends on vulnerable versions of @ethersproject/hdnode
        Depends on vulnerable versions of @ethersproject/transactions
        node_modules/@ethersproject/json-wallets


minimatch  <10.2.1
Severity: high
minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern - https://github.com/advisories/GHSA-3ppc-4f35-3m26
fix available via `npm audit fix --force`
Will install typescript-eslint@7.3.1, which is a breaking change
node_modules/typescript-eslint/node_modules/minimatch
  @typescript-eslint/typescript-estree  6.16.0 - 8.56.1-alpha.2
  Depends on vulnerable versions of minimatch
  node_modules/typescript-eslint/node_modules/@typescript-eslint/typescript-estree
    @typescript-eslint/parser  6.16.0 - 8.56.1-alpha.2
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    node_modules/typescript-eslint/node_modules/@typescript-eslint/parser
      typescript-eslint  <=8.56.1-alpha.2
      Depends on vulnerable versions of @typescript-eslint/eslint-plugin
      Depends on vulnerable versions of @typescript-eslint/parser
      Depends on vulnerable versions of @typescript-eslint/utils
      node_modules/typescript-eslint
    @typescript-eslint/type-utils  6.16.0 - 8.56.1-alpha.2
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    Depends on vulnerable versions of @typescript-eslint/utils
    node_modules/typescript-eslint/node_modules/@typescript-eslint/type-utils
      @typescript-eslint/eslint-plugin  6.16.0 - 8.56.1-alpha.2
      Depends on vulnerable versions of @typescript-eslint/type-utils
      Depends on vulnerable versions of @typescript-eslint/utils
      node_modules/typescript-eslint/node_modules/@typescript-eslint/eslint-plugin
    @typescript-eslint/utils  6.16.0 - 8.56.1-alpha.2
    Depends on vulnerable versions of @typescript-eslint/typescript-estree
    node_modules/typescript-eslint/node_modules/@typescript-eslint/utils

ws  7.0.0 - 7.5.9
Severity: high
ws affected by a DoS when handling a request with many HTTP headers - https://github.com/advisories/GHSA-3h5v-q93c-6h6q
fix available via `npm audit fix`
node_modules/ws

46 vulnerabilities (18 low, 2 moderate, 26 high)

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force