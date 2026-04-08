param(
  [ValidateSet("lite", "rich")]
  [string]$Variant = "lite",

  [ValidateSet("debug", "release")]
  [string]$BuildType = "release",

  [switch]$Install
)

$ErrorActionPreference = "Stop"

Write-Host "Building Android app variant: $Variant ($BuildType)"

$env:EXPO_PUBLIC_APP_VARIANT = $Variant

function Resolve-AndroidSdkPath {
  if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) {
    return $env:ANDROID_HOME
  }
  if ($env:ANDROID_SDK_ROOT -and (Test-Path $env:ANDROID_SDK_ROOT)) {
    return $env:ANDROID_SDK_ROOT
  }
  $defaultWindowsSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  if (Test-Path $defaultWindowsSdk) {
    return $defaultWindowsSdk
  }
  return $null
}

npx expo prebuild -p android --clean

$sdkPath = Resolve-AndroidSdkPath
if (-not $sdkPath) {
  throw "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT, or install SDK at '$env:LOCALAPPDATA\Android\Sdk'."
}

$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath

$localPropertiesPath = Join-Path "android" "local.properties"
if (-not (Test-Path $localPropertiesPath)) {
  $escapedSdkPath = $sdkPath -replace "\\", "\\\\"
  Set-Content -Path $localPropertiesPath -Value "sdk.dir=$escapedSdkPath"
  Write-Host "Created android/local.properties with sdk.dir"
}

Push-Location android
try {
  $gradleTask = ""
  if ($BuildType -eq "debug") {
    $gradleTask = "assembleDebug"
  } else {
    $gradleTask = "assembleRelease"
  }

  & .\gradlew.bat $gradleTask
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle build failed while running task '$gradleTask'. Scroll up in the logs for the first error above."
  }

  $apkRoot = "app\build\outputs\apk"
  if (-not (Test-Path $apkRoot)) {
    throw "APK output directory not found at: android\$apkRoot"
  }

  $apk = Get-ChildItem -Path $apkRoot -Recurse -File -Filter "*.apk" |
    Where-Object { $_.Name -match "-$BuildType\.apk$" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if (-not $apk) {
    $available = Get-ChildItem -Path $apkRoot -Recurse -File -Filter "*.apk" |
      Select-Object -ExpandProperty FullName
    if ($available) {
      throw "No APK matched build type '$BuildType'. Found:`n$($available -join "`n")"
    }
    throw "No APK files were generated under android\$apkRoot"
  }

  Pop-Location

  $outputName = "$Variant-$BuildType.apk"
  Copy-Item $apk.FullName $outputName -Force
  Write-Host "APK created: $outputName"

  if ($Install) {
    adb install -r $outputName
    Write-Host "Installed on connected device: $outputName"
  }
}
finally {
  if ((Get-Location).Path -like "*\android") {
    Pop-Location
  }
}
