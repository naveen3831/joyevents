import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../config/app_theme.dart';
import '../../models/event_model.dart';
import '../../services/event_service.dart';
import '../../widgets/customer_app_bar.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/error_view.dart';
import '../../widgets/event_card.dart';
import '../../widgets/loading_view.dart';

class BrowseEventsScreen extends StatefulWidget {
  const BrowseEventsScreen({super.key});

  @override
  State<BrowseEventsScreen> createState() => _BrowseEventsScreenState();
}

class _BrowseEventsScreenState extends State<BrowseEventsScreen> {
  final EventService _eventService = EventService();
  final _searchController = TextEditingController();

  List<EventModel> _events = [];
  bool _isLoading = true;
  String? _errorMessage;
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Music',
    'Wedding',
    'Corporate',
    'Birthday',
    'Catering',
    'Festival',
  ];

  @override
  void initState() {
    super.initState();
    _fetchEvents();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchEvents() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await _eventService.getEvents(
        category: _selectedCategory,
        search: _searchController.text,
      );
      if (mounted) {
        setState(() {
          _events = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomerAppBar(title: 'Browse Events'),
      body: Column(
        children: [
          // 1. Prominent Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Container(
              height: 50,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300, width: 1),
              ),
              child: TextField(
                controller: _searchController,
                onSubmitted: (_) => _fetchEvents(),
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(fontSize: 14, color: AppTheme.textColor),
                decoration: InputDecoration(
                  border: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  hintText: 'Search events by name, location...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade500),
                  prefixIcon: const Icon(
                    Icons.search_rounded,
                    color: AppTheme.primaryColor,
                    size: 22,
                  ),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 18),
                          onPressed: () {
                            _searchController.clear();
                            _fetchEvents();
                          },
                        )
                      : IconButton(
                          icon: const Icon(Icons.search_rounded, size: 20, color: AppTheme.primaryColor),
                          onPressed: _fetchEvents,
                        ),
                ),
              ),
            ),
          ),

          // 2. Horizontal Category Filters
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return InkWell(
                  onTap: () {
                    if (_selectedCategory != cat) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                      _fetchEvents();
                    }
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? AppTheme.primaryColor : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : Colors.grey.shade300,
                        width: 1,
                      ),
                    ),
                    child: Center(
                      child: Text(
                        cat,
                        style: TextStyle(
                          color: isSelected ? Colors.white : AppTheme.textColor,
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const SizedBox(height: 12),

          // 3. Event Grid Area
          Expanded(
            child: RefreshIndicator(
              onRefresh: _fetchEvents,
              child: _isLoading
                  ? const LoadingView(message: 'Loading events...')
                  : _errorMessage != null
                      ? ErrorView(message: _errorMessage!, onRetry: _fetchEvents)
                      : _events.isEmpty
                          ? const EmptyState(
                              title: 'No Events Found',
                              message: 'Try adjusting your search query or category filter.',
                              icon: Icons.event_busy_rounded,
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                                childAspectRatio: 0.60,
                              ),


                              itemCount: _events.length,
                              itemBuilder: (context, index) {
                                final event = _events[index];
                                return EventCard(
                                  event: event,
                                  onTap: () => context.push(
                                    '/customer/event-details/${event.id}',
                                    extra: event,
                                  ),
                                );
                              },
                            ),
            ),
          ),
        ],
      ),
    );
  }
}

