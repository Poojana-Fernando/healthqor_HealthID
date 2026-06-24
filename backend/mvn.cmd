@echo off
setlocal
if defined MAVEN_HOME (
    "%MAVEN_HOME%\bin\mvn.cmd" %*
) else if exist "C:\Program Files\Maven\apache-maven-3.9.16\bin\mvn.cmd" (
    "C:\Program Files\Maven\apache-maven-3.9.16\bin\mvn.cmd" %*
) else (
    call "%~dp0mvnw.cmd" %*
)

