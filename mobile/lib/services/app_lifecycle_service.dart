import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Global application lifecycle service managing background/foreground state transitions.
///
/// Protects battery, CPU, network, and memory resources when the application
/// enters the background (paused / hidden / inactive), and safely resumes active operations
/// when returning to the foreground (resumed).
class AppLifecycleService with WidgetsBindingObserver {
  static final AppLifecycleService _instance = AppLifecycleService._internal();
  factory AppLifecycleService() => _instance;

  bool _isBackgrounded = false;
  bool get isBackgrounded => _isBackgrounded;

  bool _initialized = false;
  final List<VoidCallback> _onPauseCallbacks = [];
  final List<VoidCallback> _onResumeCallbacks = [];

  AppLifecycleService._internal();

  /// Initialize the global lifecycle observer. Called once at app startup.
  void initialize() {
    if (_initialized) return;
    WidgetsBinding.instance.addObserver(this);
    _initialized = true;
    if (kDebugMode) {
      debugPrint('[LIFECYCLE] AppLifecycleService initialized.');
    }
  }

  /// Register callback to execute when app enters background
  void addPauseCallback(VoidCallback callback) {
    if (!_onPauseCallbacks.contains(callback)) {
      _onPauseCallbacks.add(callback);
    }
  }

  /// Unregister pause callback
  void removePauseCallback(VoidCallback callback) {
    _onPauseCallbacks.remove(callback);
  }

  /// Register callback to execute when app resumes foreground
  void addResumeCallback(VoidCallback callback) {
    if (!_onResumeCallbacks.contains(callback)) {
      _onResumeCallbacks.add(callback);
    }
  }

  /// Unregister resume callback
  void removeResumeCallback(VoidCallback callback) {
    _onResumeCallbacks.remove(callback);
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);

    if (kDebugMode) {
      debugPrint('[LIFECYCLE CHANGE] AppLifecycleState: $state');
    }

    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
      case AppLifecycleState.inactive:
        if (!_isBackgrounded) {
          _isBackgrounded = true;
          _onAppBackgrounded();
        }
        break;

      case AppLifecycleState.resumed:
        if (_isBackgrounded) {
          _isBackgrounded = false;
          _onAppResumed();
        }
        break;

      case AppLifecycleState.detached:
        _onAppDetached();
        break;
    }
  }

  /// Triggered when app enters background
  void _onAppBackgrounded() {
    if (kDebugMode) {
      debugPrint('[LIFECYCLE] App backgrounded. Pausing non-essential activities (${_onPauseCallbacks.length} pause callbacks)...');
    }
    for (final callback in List.of(_onPauseCallbacks)) {
      try {
        callback();
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[LIFECYCLE PAUSE CALLBACK ERROR] $e');
        }
      }
    }
  }

  /// Triggered when app returns to foreground
  void _onAppResumed() {
    if (kDebugMode) {
      debugPrint('[LIFECYCLE] App resumed. Executing resume callbacks (${_onResumeCallbacks.length})...');
    }
    for (final callback in List.of(_onResumeCallbacks)) {
      try {
        callback();
      } catch (e) {
        if (kDebugMode) {
          debugPrint('[LIFECYCLE RESUME CALLBACK ERROR] $e');
        }
      }
    }
  }

  /// Triggered when app process is detached
  void _onAppDetached() {
    if (kDebugMode) {
      debugPrint('[LIFECYCLE] App process detached.');
    }
  }

  void dispose() {
    if (_initialized) {
      WidgetsBinding.instance.removeObserver(this);
      _onPauseCallbacks.clear();
      _onResumeCallbacks.clear();
      _initialized = false;
    }
  }
}
