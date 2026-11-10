function isPrivilegedSystemRun(args, uid) {
    return uid === 0 && args.includes('--system');
}

module.exports = { isPrivilegedSystemRun };
