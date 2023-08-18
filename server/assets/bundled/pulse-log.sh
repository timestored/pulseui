#!/bin/bash 

SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")

#export DEMO=false
#export DEMO_RUNDB=true
#export LICENSE_TEXT=H4sIAAAAAAAAAGNgYNAz0GESET/GV8B7YOVS/52fchz6flhf06u9wySiqXGhQvPr7dUTOvvdGje9mOJVFvjFyMDIWNfAWNfQpAbCNNE1Mq0JKcpMzKmpMa4JKM0pTgUAEC1qklYAAAA=

#export SERVER_PORT=8080

#export MASTER_API_KEY=ef003741-bc43-467f-b9ba-bd0d85e38441
#export AUTH_URL='http://admin:pass2@localhost:5000/?$[.z.pw[`$"((username))";"((password))"];`granted;`denied]'
#export ROLE_URL='http://admin:pass2@localhost:5000/a.txt?getRoles[`$"((username))"]'

#export AUTH_PROXY_ENABLED=false
#export USERNAME_HEADER_NAME=X-WEBAUTH-USER
#export AUTO_SIGN_UP=true

# If bundled JRE -> use it
[ -d "$SCRIPTPATH/jre" ] && EXPORT JAVA_HOME="$SCRIPTPATH/jre" && EXPORT "PATH=$JAVA_HOME/bin:$PATH"
java -cp "$SCRIPTPATH/pulse.jar:$SCRIPTPATH/libs/*" com.sqldashboards.webby.Application -v %*
