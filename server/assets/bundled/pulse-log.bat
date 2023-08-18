@ECHO OFF
REM Always use this batch file to call as all lower interfaces such as java class names may change.
title Pulse

REM SET DEMO=false
REM SET DEMO_RUNDB=true
REM SET LICENSE_TEXT=H4sIAAAAAAAAAGNgYNAz0GESET/GV8B7YOVS/52fchz6flhf06u9wySiqXGhQvPr7dUTOvvdGje9mOJVFvjFyMDIWNfAWNfQpAbCNNE1Mq0JKcpMzKmpMa4JKM0pTgUAEC1qklYAAAA=

REM SET SERVER_PORT=8080

REM SET MASTER_API_KEY=ef003741-bc43-467f-b9ba-bd0d85e38441
REM SET AUTH_URL=http://admin:pass2@localhost:5000/?$[.z.pw[`$"((username))";"((password))"];`granted;`denied]
REM SET ROLE_URL=http://admin:pass2@localhost:5000/a.txt?getRoles[`$"((username))"]

REM SET AUTH_PROXY_ENABLED=false
REM SET USERNAME_HEADER_NAME=X-WEBAUTH-USER
REM ROOT_URL only required if forwarding to subdirectory.
REM SET ROOT_URL=http://pulseproxy.me/pp

REM SET AUTO_SIGN_UP=true

REM If bundled JRE -> use it
if exist "%~dp0\jre\" SET JAVA_HOME="%~dp0\jre"
if exist "%~dp0\jre\" SET "PATH=%JAVA_HOME%\bin;%PATH%"

java -cp "%~dp0\pulse.jar;%~dp0\libs\*" com.sqldashboards.webby.Application -v %*
@pause