@echo off
setlocal
if defined MAVEN_HOME (
    "%MAVEN_HOME%\bin\mvn.cmd" %*
) else if exist "C:\Program Files\Maven\apache-maven-3.9.16\bin\mvn.cmd" (
    "C:\Program Files\Maven\apache-maven-3.9.16\bin\mvn.cmd" %*
) else (
    echo Maven not found. Set MAVEN_HOME or install Maven and add it to PATH.
    exit /b 1
)
