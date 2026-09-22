import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_theme.dart';

class EventSchedulePicker extends StatefulWidget {
  final String durationType; // 'single' or 'multiple'
  final ValueChanged<String> onDurationTypeChanged;
  final DateTime? startDate;
  final ValueChanged<DateTime?> onStartDateChanged;
  final DateTime? endDate;
  final ValueChanged<DateTime?> onEndDateChanged;
  final TimeOfDay? startTime;
  final ValueChanged<TimeOfDay?> onStartTimeChanged;
  final TimeOfDay? endTime;
  final ValueChanged<TimeOfDay?> onEndTimeChanged;
  final bool hasCustomSchedule;
  final ValueChanged<bool> onHasCustomScheduleChanged;
  final List<Map<String, dynamic>> dailySchedule;
  final ValueChanged<List<Map<String, dynamic>>> onDailyScheduleChanged;

  const EventSchedulePicker({
    super.key,
    required this.durationType,
    required this.onDurationTypeChanged,
    required this.startDate,
    required this.onStartDateChanged,
    required this.endDate,
    required this.onEndDateChanged,
    required this.startTime,
    required this.onStartTimeChanged,
    required this.endTime,
    required this.onEndTimeChanged,
    required this.hasCustomSchedule,
    required this.onHasCustomScheduleChanged,
    required this.dailySchedule,
    required this.onDailyScheduleChanged,
  });

  @override
  State<EventSchedulePicker> createState() => _EventSchedulePickerState();
}

class _EventSchedulePickerState extends State<EventSchedulePicker> {
  String _formatDate(DateTime? dt) {
    if (dt == null) return 'Select Date';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
  }

  String _formatTime(TimeOfDay? time) {
    if (time == null) return 'Select Time';
    return time.format(context);
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = isStart
        ? (widget.startDate ?? DateTime.now().add(const Duration(days: 1)))
        : (widget.endDate ?? widget.startDate ?? DateTime.now().add(const Duration(days: 1)));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      if (isStart) {
        widget.onStartDateChanged(picked);
        if (widget.endDate != null && widget.endDate!.isBefore(picked)) {
          widget.onEndDateChanged(picked);
        }
      } else {
        widget.onEndDateChanged(picked);
      }
      _syncDailySchedule();
    }
  }

  Future<void> _pickTime({required bool isStart}) async {
    final initial = isStart
        ? (widget.startTime ?? const TimeOfDay(hour: 9, minute: 0))
        : (widget.endTime ?? const TimeOfDay(hour: 18, minute: 0));
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(
          colorScheme: const ColorScheme.light(primary: AppTheme.primaryColor),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      if (isStart) {
        widget.onStartTimeChanged(picked);
      } else {
        widget.onEndTimeChanged(picked);
      }
    }
  }

  void _syncDailySchedule() {
    if (widget.durationType != 'multiple' || widget.startDate == null || widget.endDate == null) return;
    final days = widget.endDate!.difference(widget.startDate!).inDays + 1;
    if (days <= 0 || days > 30) return;

    final updated = <Map<String, dynamic>>[];
    for (int i = 0; i < days; i++) {
      final dt = widget.startDate!.add(Duration(days: i));
      final dateStr = dt.toIso8601String().split('T').first;
      final existing = widget.dailySchedule.firstWhere(
        (element) => element['date'] == dateStr,
        orElse: () => {
          'date': dateStr,
          'startTime': widget.startTime != null ? _formatTime(widget.startTime) : '09:00 AM',
          'endTime': widget.endTime != null ? _formatTime(widget.endTime) : '06:00 PM',
        },
      );
      updated.add(existing);
    }
    widget.onDailyScheduleChanged(updated);
  }

  @override
  Widget build(BuildContext context) {
    final isMulti = widget.durationType == 'multiple';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'DURATION TYPE',
            style: GoogleFonts.poppins(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: AppTheme.subtitleColor,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 8),

          // Duration Selector Toggle
          Row(
            children: [
              Expanded(
                child: _buildDurationTypeButton(
                  label: 'Single Day Event',
                  isSelected: !isMulti,
                  onTap: () {
                    widget.onDurationTypeChanged('single');
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildDurationTypeButton(
                  label: 'Multi-Day Event',
                  isSelected: isMulti,
                  onTap: () {
                    widget.onDurationTypeChanged('multiple');
                    _syncDailySchedule();
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Date Selection Section
          if (!isMulti) ...[
            _buildFieldLabel('EVENT DATE', isRequired: true),
            _buildPickerButton(
              icon: Icons.calendar_today_outlined,
              label: _formatDate(widget.startDate),
              onTap: () => _pickDate(isStart: true),
            ),
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildFieldLabel('START DATE', isRequired: true),
                      _buildPickerButton(
                        icon: Icons.calendar_today_outlined,
                        label: _formatDate(widget.startDate),
                        onTap: () => _pickDate(isStart: true),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildFieldLabel('END DATE', isRequired: true),
                      _buildPickerButton(
                        icon: Icons.event_outlined,
                        label: _formatDate(widget.endDate),
                        onTap: () => _pickDate(isStart: false),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],

          const SizedBox(height: 14),

          // Time Selection Section
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel(isMulti ? 'DAILY START TIME' : 'START TIME', isRequired: true),
                    _buildPickerButton(
                      icon: Icons.access_time_outlined,
                      label: _formatTime(widget.startTime),
                      onTap: () => _pickTime(isStart: true),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFieldLabel(isMulti ? 'DAILY END TIME' : 'END TIME', isRequired: true),
                    _buildPickerButton(
                      icon: Icons.access_time_filled_outlined,
                      label: _formatTime(widget.endTime),
                      onTap: () => _pickTime(isStart: false),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Custom Schedule Checkbox for Multi-Day
          if (isMulti && widget.startDate != null && widget.endDate != null) ...[
            const SizedBox(height: 16),
            InkWell(
              onTap: () {
                final next = !widget.hasCustomSchedule;
                widget.onHasCustomScheduleChanged(next);
                if (next) _syncDailySchedule();
              },
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  children: [
                    SizedBox(
                      height: 24,
                      width: 24,
                      child: Checkbox(
                        value: widget.hasCustomSchedule,
                        activeColor: AppTheme.primaryColor,
                        onChanged: (val) {
                          final next = val ?? false;
                          widget.onHasCustomScheduleChanged(next);
                          if (next) _syncDailySchedule();
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Set Custom Daily Schedule (different times per day)',
                        style: GoogleFonts.poppins(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: AppTheme.textColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (widget.hasCustomSchedule && widget.dailySchedule.isNotEmpty) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.inputFillColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.borderColor),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: widget.dailySchedule.asMap().entries.map((entry) {
                    final index = entry.key;
                    final dayData = entry.value;
                    final dateStr = dayData['date']?.toString() ?? '';

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Row(
                        children: [
                          Expanded(
                            flex: 3,
                            child: Text(
                              'Day ${index + 1} ($dateStr):',
                              style: GoogleFonts.poppins(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.textColor,
                              ),
                            ),
                          ),
                          Expanded(
                            flex: 4,
                            child: Row(
                              children: [
                                Expanded(
                                  child: _buildSmallTimeChip(
                                    label: dayData['startTime']?.toString() ?? '09:00 AM',
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: const TimeOfDay(hour: 9, minute: 0),
                                      );
                                      if (picked != null) {
                                        final updated = List<Map<String, dynamic>>.from(widget.dailySchedule);
                                        updated[index]['startTime'] = picked.format(context);
                                        widget.onDailyScheduleChanged(updated);
                                      }
                                    },
                                  ),
                                ),
                                const Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 4),
                                  child: Text('-', style: TextStyle(fontSize: 12, color: AppTheme.subtitleColor)),
                                ),
                                Expanded(
                                  child: _buildSmallTimeChip(
                                    label: dayData['endTime']?.toString() ?? '06:00 PM',
                                    onTap: () async {
                                      final picked = await showTimePicker(
                                        context: context,
                                        initialTime: const TimeOfDay(hour: 18, minute: 0),
                                      );
                                      if (picked != null) {
                                        final updated = List<Map<String, dynamic>>.from(widget.dailySchedule);
                                        updated[index]['endTime'] = picked.format(context);
                                        widget.onDailyScheduleChanged(updated);
                                      }
                                    },
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildDurationTypeButton({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: isSelected ? AppTheme.tintVioletBg : Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppTheme.primaryColor : AppTheme.borderColor,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          child: Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 12.5,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AppTheme.primaryColor : AppTheme.textColor,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFieldLabel(String label, {bool isRequired = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Text(
            label,
            style: GoogleFonts.poppins(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: AppTheme.subtitleColor,
              letterSpacing: 0.5,
            ),
          ),
          if (isRequired)
            const Text(
              ' *',
              style: TextStyle(color: AppTheme.errorColor, fontWeight: FontWeight.bold),
            ),
        ],
      ),
    );
  }

  Widget _buildPickerButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        height: 46,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: AppTheme.inputFillColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.borderColor),
        ),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppTheme.subtitleColor),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSmallTimeChip({required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppTheme.borderColor),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textColor, fontWeight: FontWeight.w500),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
