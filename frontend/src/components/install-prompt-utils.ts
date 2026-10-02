export function isIosSafari(device: Pick<Navigator, 'maxTouchPoints' | 'platform' | 'userAgent'>) {
  const isIos = /iPad|iPhone|iPod/u.test(device.userAgent)
    || (device.platform === 'MacIntel' && device.maxTouchPoints > 1)
  const isAnotherIosBrowser = /CriOS|EdgiOS|FxiOS|OPiOS/u.test(device.userAgent)
  return isIos && /Safari/u.test(device.userAgent) && !isAnotherIosBrowser
}
